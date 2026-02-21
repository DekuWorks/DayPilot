using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using DayPilot.Api.Data;
using DayPilot.Api.Helpers;
using DayPilot.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Respect X-Forwarded-* when behind Fly.io or other proxies (so Swagger and links use correct URL)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "https://www.daypilot.co" };
        policy.WithOrigins(origins)
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// Prefer DATABASE_URL (set by Fly Postgres attach) then ConnectionStrings:DefaultConnection
var connStr = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=daypilot.db";
var usePostgres = connStr.TrimStart().StartsWith("Host=", StringComparison.OrdinalIgnoreCase)
    || connStr.TrimStart().StartsWith("Server=", StringComparison.OrdinalIgnoreCase)
    || connStr.TrimStart().StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
    || connStr.TrimStart().StartsWith("postgres://", StringComparison.OrdinalIgnoreCase);
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (usePostgres)
        options.UseNpgsql(connStr);
    else
        options.UseSqlite(connStr);
});

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "dev-secret-change-in-production";
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "daypilot-api",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "daypilot-app",
            ValidateIssuer = true,
            ValidateAudience = true,
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DayPilot API",
        Version = "v1",
        Description = "DayPilot backend API (auth, Google Calendar connect & discover)"
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseForwardedHeaders();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Ensure DB exists and is migrated
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "DayPilot API v1");
    options.RoutePrefix = "swagger";
});

// Root redirect so base URL shows Swagger UI
app.MapGet("/", () => Results.Redirect("/swagger", permanent: false))
    .ExcludeFromDescription();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .WithName("HealthCheck")
    .WithTags("Health");

var frontendUrl = (builder.Configuration["FrontendUrl"] ?? "https://www.daypilot.co").TrimEnd('/');

// --- Auth ---
app.MapPost("/api/auth/register", async (RegisterRequest body, AppDbContext db, IConfiguration config) =>
{
    if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
        return Results.Json(new { error = "Email and password are required" }, statusCode: 400);
    if (body.Password.Length < 8)
        return Results.Json(new { error = "Password must be at least 8 characters" }, statusCode: 400);
    var email = body.Email.Trim().ToLowerInvariant();
    if (await db.Users.AnyAsync(u => u.Email == email))
        return Results.Json(new { error = "Email already registered" }, statusCode: 400);
    var user = new User
    {
        Id = Guid.NewGuid(),
        Email = email,
        Name = body.Name?.Trim(),
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password.Trim()),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();
    var token = AuthHelper.IssueJwt(user, config);
    return Results.Json(new { token, user = new { id = user.Id, email = user.Email, name = user.Name } });
}).WithTags("Auth");

app.MapPost("/api/auth/login", async (LoginRequest body, AppDbContext db, IConfiguration config) =>
{
    if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
        return Results.Json(new { error = "Email and password are required" }, statusCode: 400);
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == body.Email.Trim().ToLowerInvariant());
    if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(body.Password.Trim(), user.PasswordHash))
        return Results.Json(new { error = "Invalid email or password" }, statusCode: 401);
    var token = AuthHelper.IssueJwt(user, config);
    return Results.Json(new { token, user = new { id = user.Id, email = user.Email, name = user.Name } });
}).WithTags("Auth");

app.MapGet("/api/auth/google", (HttpContext ctx, IConfiguration config) =>
{
    var clientId = config["Google:ClientId"]?.Trim();
    var returnPath = ctx.Request.Query["return_path"].FirstOrDefault() ?? "/app";
    if (string.IsNullOrEmpty(clientId))
        return Results.Json(new { error = "Google OAuth not configured" }, statusCode: 500);
    var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
    var redirectUri = $"{baseUrl}/api/auth/google/callback";
    var state = returnPath;
    var url = "https://accounts.google.com/o/oauth2/v2/auth?" + string.Join("&", new[]
    {
        "response_type=code",
        "client_id=" + Uri.EscapeDataString(clientId),
        "redirect_uri=" + Uri.EscapeDataString(redirectUri),
        "scope=" + Uri.EscapeDataString("openid email profile"),
        "state=" + Uri.EscapeDataString(state)
    });
    return Results.Redirect(url);
}).WithTags("Auth");

app.MapGet("/api/auth/google/callback", async (string? code, string? state, string? error, HttpContext ctx, AppDbContext db, IConfiguration config, IHttpClientFactory httpFactory) =>
{
    var redirectBase = frontendUrl + (state?.TrimStart('/') ?? "app");
    if (!string.IsNullOrEmpty(error))
        return Results.Redirect($"{frontendUrl}/login?error={Uri.EscapeDataString(error)}");
    if (string.IsNullOrEmpty(code))
        return Results.Redirect($"{frontendUrl}/login?error=missing_code");
    var clientId = config["Google:ClientId"]?.Trim();
    var clientSecret = config["Google:ClientSecret"]?.Trim();
    if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        return Results.Redirect($"{frontendUrl}/login?error=oauth_not_configured");
    var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
    var redirectUri = $"{baseUrl}/api/auth/google/callback";
    var tokenRes = await httpFactory.CreateClient().PostAsync(
        new Uri("https://oauth2.googleapis.com/token"),
        new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["redirect_uri"] = redirectUri,
            ["grant_type"] = "authorization_code"
        }));
    if (!tokenRes.IsSuccessStatusCode)
        return Results.Redirect($"{frontendUrl}/login?error=token_exchange_failed");
    var tokens = await tokenRes.Content.ReadFromJsonAsync<JsonElement>();
    var accessToken = tokens.GetProperty("access_token").GetString() ?? "";
    var userInfoReq = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo");
    userInfoReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
    var userInfoRes = await httpFactory.CreateClient().SendAsync(userInfoReq);
    var userInfo = userInfoRes.IsSuccessStatusCode ? await userInfoRes.Content.ReadFromJsonAsync<JsonElement>() : (JsonElement?)null;
    var googleId = userInfo?.TryGetProperty("id", out var idEl) == true ? idEl.GetString() : null;
    var email = userInfo?.TryGetProperty("email", out var emEl) == true ? emEl.GetString()?.Trim() : null;
    var name = userInfo?.TryGetProperty("name", out var nmEl) == true ? nmEl.GetString()?.Trim() : null;
    if (string.IsNullOrEmpty(email))
        return Results.Redirect($"{frontendUrl}/login?error=no_email_from_google");
    var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId || u.Email == email);
    if (user == null)
    {
        user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = name,
            GoogleId = googleId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }
    else if (user.GoogleId != googleId)
    {
        user.GoogleId = googleId;
        user.Name = name ?? user.Name;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
    var jwt = AuthHelper.IssueJwt(user, config);
    return Results.Redirect($"{frontendUrl}/app?token={Uri.EscapeDataString(jwt)}");
}).WithTags("Auth");

// --- Google Connect (Integrations) ---
// Supports ?token=JWT (for redirect from frontend) or Authorization: Bearer JWT
app.MapGet("/api/google/authorize", (HttpContext ctx, string? return_path, string? token, IConfiguration config) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue("sub");
    if (string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(token))
        userId = AuthHelper.ValidateJwtAndGetUserId(token, config);
    if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var uid))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);
    var clientId = config["Google:ClientId"]?.Trim();
    if (string.IsNullOrEmpty(clientId))
        return Results.Json(new { error = "Google OAuth not configured" }, statusCode: 500);
    var path = (return_path ?? "/app/integrations").Trim();
    if (!path.StartsWith("/")) path = "/" + path;
    var state = $"{uid}|{path}";
    var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
    var redirectUri = $"{baseUrl}/api/google/callback";
    var scopes = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";
    var url = "https://accounts.google.com/o/oauth2/v2/auth?" + string.Join("&", new[]
    {
        "response_type=code",
        "client_id=" + Uri.EscapeDataString(clientId),
        "redirect_uri=" + Uri.EscapeDataString(redirectUri),
        "scope=" + Uri.EscapeDataString(scopes),
        "access_type=offline",
        "prompt=consent",
        "state=" + Uri.EscapeDataString(state)
    });
    return Results.Redirect(url);
}).RequireAuthorization().WithTags("Google");

app.MapGet("/api/google/callback", async (string? code, string? state, string? error, HttpContext ctx, AppDbContext db, IConfiguration config, IHttpClientFactory httpFactory) =>
{
    var returnPath = "/app/integrations";
    string? userId = null;
    if (!string.IsNullOrEmpty(state) && state.Contains('|'))
    {
        var parts = state.Split('|', 2);
        userId = parts[0];
        if (parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1])) returnPath = parts[1].Trim();
    }
    if (!string.IsNullOrEmpty(error))
        return Results.Redirect($"{frontendUrl}{returnPath}?error={Uri.EscapeDataString(error)}");
    if (string.IsNullOrEmpty(code))
        return Results.Redirect($"{frontendUrl}{returnPath}?error=missing_code");
    if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var uid))
        return Results.Redirect($"{frontendUrl}{returnPath}?error=missing_user_id");
    var clientId = config["Google:ClientId"]?.Trim();
    var clientSecret = config["Google:ClientSecret"]?.Trim();
    if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        return Results.Redirect($"{frontendUrl}{returnPath}?error=oauth_not_configured");
    var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
    var redirectUri = $"{baseUrl}/api/google/callback";
    var tokenRes = await httpFactory.CreateClient().PostAsync(
        new Uri("https://oauth2.googleapis.com/token"),
        new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["redirect_uri"] = redirectUri,
            ["grant_type"] = "authorization_code"
        }));
    if (!tokenRes.IsSuccessStatusCode)
        return Results.Redirect($"{frontendUrl}{returnPath}?error=token_exchange_failed");
    var tokens = await tokenRes.Content.ReadFromJsonAsync<JsonElement>();
    var accessToken = tokens.GetProperty("access_token").GetString() ?? "";
    var refreshToken = tokens.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
    var expiresIn = tokens.TryGetProperty("expires_in", out var exp) ? exp.GetInt32() : 3600;
    var scope = tokens.TryGetProperty("scope", out var sc) ? sc.GetString() : null;
    var userInfoReq = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo");
    userInfoReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
    var userInfoResp = await httpFactory.CreateClient().SendAsync(userInfoReq, ctx.RequestAborted);
    var providerAccountId = uid.ToString();
    var email = $"{uid}@google.oauth";
    if (userInfoResp.IsSuccessStatusCode)
    {
        var userInfo = await userInfoResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ctx.RequestAborted);
        if (userInfo.TryGetProperty("id", out var idEl)) providerAccountId = idEl.GetString() ?? providerAccountId;
        if (userInfo.TryGetProperty("email", out var emEl)) email = emEl.GetString()?.Trim() ?? email;
    }
    var expiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
    var existing = await db.ConnectedAccounts
        .FirstOrDefaultAsync(c => c.UserId == uid && c.Provider == "google" && c.ProviderAccountId == providerAccountId, ctx.RequestAborted);
    if (existing != null)
    {
        existing.AccessToken = accessToken;
        existing.RefreshToken = refreshToken ?? existing.RefreshToken;
        existing.TokenExpiresAt = expiresAt;
        existing.Scope = scope;
        existing.IsActive = true;
        existing.UpdatedAt = DateTime.UtcNow;
    }
    else
    {
        db.ConnectedAccounts.Add(new ConnectedAccount
        {
            Id = Guid.NewGuid(),
            UserId = uid,
            Provider = "google",
            ProviderAccountId = providerAccountId,
            Email = email,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            TokenExpiresAt = expiresAt,
            Scope = scope,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }
    await db.SaveChangesAsync(ctx.RequestAborted);
    return Results.Redirect($"{frontendUrl}{returnPath}?success=connected");
}).WithTags("Google");

// --- Me ---
app.MapGet("/api/me", async (HttpContext ctx, AppDbContext db) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue("sub");
    if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var uid))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);
    var user = await db.Users.FindAsync(uid);
    if (user == null)
        return Results.Json(new { error = "User not found" }, statusCode: 404);
    return Results.Json(new { id = user.Id, email = user.Email, name = user.Name });
}).RequireAuthorization().WithTags("Me");

app.MapGet("/api/me/connected-accounts", async (HttpContext ctx, AppDbContext db) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue("sub");
    if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var uid))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);
    var list = await db.ConnectedAccounts
        .Where(c => c.UserId == uid && c.IsActive)
        .OrderByDescending(c => c.CreatedAt)
        .Select(c => new { id = c.Id, provider = c.Provider, email = c.Email, token_expires_at = c.TokenExpiresAt })
        .ToListAsync(ctx.RequestAborted);
    return Results.Json(list);
}).RequireAuthorization().WithTags("Me");

app.MapDelete("/api/me/connected-accounts/{id:guid}", async (Guid id, HttpContext ctx, AppDbContext db) =>
{
    var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue("sub");
    if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var uid))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);
    var acc = await db.ConnectedAccounts.FirstOrDefaultAsync(c => c.Id == id && c.UserId == uid, ctx.RequestAborted);
    if (acc == null)
        return Results.Json(new { error = "Not found" }, statusCode: 404);
    acc.IsActive = false;
    acc.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ctx.RequestAborted);
    return Results.NoContent();
}).RequireAuthorization().WithTags("Me");

// POST /api/google/discover — body: { "accessToken": "xxx", "refreshToken": "xxx" } or { "connectedAccountId": "guid" } with Bearer JWT.
app.MapPost("/api/google/discover", async (HttpContext context, IConfiguration config, IHttpClientFactory clientFactory, AppDbContext db) =>
{
    var googleClientId = config["Google:ClientId"]?.Trim();
    var googleClientSecret = config["Google:ClientSecret"]?.Trim();
    if (string.IsNullOrEmpty(googleClientId) || string.IsNullOrEmpty(googleClientSecret))
        return Results.Json(new { error = "Server configuration error: Google OAuth not configured" }, statusCode: 500);

    DiscoverRequest? body;
    try
    {
        body = await context.Request.ReadFromJsonAsync<DiscoverRequest>(context.RequestAborted);
    }
    catch (OperationCanceledException)
    {
        return Results.Json(new { error = "Request cancelled" }, statusCode: 499);
    }
    catch (JsonException ex)
    {
        return Results.Json(new { error = "Invalid JSON body. " + ex.Message }, statusCode: 400);
    }

    if (body == null)
        return Results.Json(new { error = "Request body is required" }, statusCode: 400);

    string accessToken;
    string? refreshToken = null;

    if (body.ConnectedAccountId.HasValue)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var uid))
            return Results.Json(new { error = "Unauthorized" }, statusCode: 401);
        var acc = await db.ConnectedAccounts.FirstOrDefaultAsync(c => c.Id == body.ConnectedAccountId.Value && c.UserId == uid && c.IsActive, context.RequestAborted);
        if (acc == null)
            return Results.Json(new { error = "Connected account not found" }, statusCode: 404);
        accessToken = acc.AccessToken;
        refreshToken = acc.RefreshToken;
    }
    else
    {
        var validationErrors = AuthHelper.ValidateDiscoverRequest(body);
        if (validationErrors.Count > 0)
            return Results.Json(new { error = string.Join(" ", validationErrors), errors = validationErrors }, statusCode: 400);
        accessToken = body.AccessToken!.Trim();
        refreshToken = body.RefreshToken?.Trim();
    }

    var http = clientFactory.CreateClient();

    // 3) Optional: refresh token
    if (!string.IsNullOrWhiteSpace(refreshToken))
    {
        var refreshRes = await http.PostAsync(
            new Uri("https://oauth2.googleapis.com/token"),
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = googleClientId,
                ["client_secret"] = googleClientSecret,
                ["refresh_token"] = refreshToken!,
                ["grant_type"] = "refresh_token"
            }),
            context.RequestAborted);

        if (refreshRes.IsSuccessStatusCode)
        {
            try
            {
                var tokens = await refreshRes.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: context.RequestAborted);
                if (tokens.TryGetProperty("access_token", out var accessEl))
                {
                    var newAccess = accessEl.GetString();
                    if (!string.IsNullOrWhiteSpace(newAccess))
                        accessToken = newAccess.Trim();
                }
            }
            catch (JsonException)
            {
                // Keep existing accessToken if refresh response is invalid
            }
        }
        // If refresh fails, keep using provided accessToken
    }

    // 4) Call Google Calendar API
    var calReq = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/calendar/v3/users/me/calendarList");
    calReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

    HttpResponseMessage calRes;
    try
    {
        calRes = await http.SendAsync(calReq, context.RequestAborted);
    }
    catch (OperationCanceledException)
    {
        return Results.Json(new { error = "Request cancelled" }, statusCode: 499);
    }

    if (!calRes.IsSuccessStatusCode)
    {
        var errBody = await calRes.Content.ReadAsStringAsync(context.RequestAborted);
        var message = errBody.Length > 200 ? errBody.AsSpan(0, 200).ToString() + "..." : errBody;
        return Results.Json(new { error = "Google Calendar API error: " + calRes.StatusCode + ". " + message }, statusCode: 502);
    }

    string calJson;
    try
    {
        calJson = await calRes.Content.ReadAsStringAsync(context.RequestAborted);
    }
    catch (OperationCanceledException)
    {
        return Results.Json(new { error = "Request cancelled" }, statusCode: 499);
    }

    if (string.IsNullOrWhiteSpace(calJson))
        return Results.Json(new { error = "Google Calendar API returned empty response" }, statusCode: 502);

    JsonDocument calDoc;
    try
    {
        calDoc = JsonDocument.Parse(calJson);
    }
    catch (JsonException ex)
    {
        return Results.Json(new { error = "Invalid response from Google Calendar API. " + ex.Message }, statusCode: 502);
    }

    using (calDoc)
    {
        var root = calDoc.RootElement;
        if (!root.TryGetProperty("items", out var itemsEl) || itemsEl.ValueKind != JsonValueKind.Array)
        {
            return Results.Json(new
            {
                success = true,
                calendarsDiscovered = 0,
                calendars = Array.Empty<object>()
            });
        }

        int itemCount = itemsEl.GetArrayLength();
        var calendars = new List<object>(itemCount);

        for (var i = 0; i < itemCount; i++)
        {
            var item = itemsEl[i];
            if (!item.TryGetProperty("id", out var idEl))
                continue;
            var id = idEl.GetString();
            if (string.IsNullOrWhiteSpace(id))
                continue;

            calendars.Add(new
            {
                id = id.Trim(),
                summary = item.TryGetProperty("summary", out var sum) ? sum.GetString()?.Trim() : null,
                accessRole = item.TryGetProperty("accessRole", out var ar) ? ar.GetString() : null,
                backgroundColor = item.TryGetProperty("backgroundColor", out var bg) ? bg.GetString() : null,
                description = item.TryGetProperty("description", out var desc) ? desc.GetString() : null
            });
        }

        return Results.Json(new
        {
            success = true,
            calendarsDiscovered = calendars.Count,
            calendars
        });
    }
})
.WithName("GoogleDiscover")
.WithTags("Google");

app.Run();
