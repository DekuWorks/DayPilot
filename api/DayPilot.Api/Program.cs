using System.ComponentModel.DataAnnotations;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DayPilot API",
        Version = "v1",
        Description = "DayPilot backend API (Google Calendar discover, etc.)"
    });
});

var app = builder.Build();

app.UseCors();

app.UseSwagger();
app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "DayPilot API v1"));

app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .WithName("HealthCheck")
    .WithTags("Health");

// POST /api/google/discover — body: { "accessToken": "xxx", "refreshToken": "xxx" }. Returns list of Google calendars (no persistence).
app.MapPost("/api/google/discover", async (HttpContext context, IConfiguration config, IHttpClientFactory clientFactory) =>
{
    // 1) Validate config
    var googleClientId = config["Google:ClientId"]?.Trim();
    var googleClientSecret = config["Google:ClientSecret"]?.Trim();
    if (string.IsNullOrEmpty(googleClientId) || string.IsNullOrEmpty(googleClientSecret))
        return Results.Json(new { error = "Server configuration error: Google OAuth not configured" }, statusCode: 500);

    // 2) Validate request body
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

    var validationErrors = ValidateDiscoverRequest(body);
    if (validationErrors.Count > 0)
        return Results.Json(new { error = string.Join(" ", validationErrors), errors = validationErrors }, statusCode: 400);

    var accessToken = body.AccessToken!.Trim();
    var http = clientFactory.CreateClient();

    // 3) Optional: refresh token
    if (!string.IsNullOrWhiteSpace(body.RefreshToken))
    {
        var refreshToken = body.RefreshToken!.Trim();
        var refreshRes = await http.PostAsync(
            new Uri("https://oauth2.googleapis.com/token"),
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = googleClientId,
                ["client_secret"] = googleClientSecret,
                ["refresh_token"] = refreshToken,
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

static IList<string> ValidateDiscoverRequest(DiscoverRequest request)
{
    var errors = new List<string>();
    if (string.IsNullOrWhiteSpace(request.AccessToken))
        errors.Add("accessToken is required.");
    else if (request.AccessToken.Length > 2000)
        errors.Add("accessToken must be at most 2000 characters.");
    if (request.RefreshToken != null && request.RefreshToken.Length > 2000)
        errors.Add("refreshToken must be at most 2000 characters.");
    return errors;
}

internal sealed class DiscoverRequest
{
    [Required(ErrorMessage = "accessToken is required")]
    [MaxLength(2000)]
    public string? AccessToken { get; set; }

    [MaxLength(2000)]
    public string? RefreshToken { get; set; }
}
