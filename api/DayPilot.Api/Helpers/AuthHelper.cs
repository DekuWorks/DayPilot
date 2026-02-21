using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using DayPilot.Api.Models;

namespace DayPilot.Api.Helpers;

internal static class AuthHelper
{
    /// <summary>Validates JWT and returns user id (sub claim) or null.</summary>
    public static string? ValidateJwtAndGetUserId(string jwt, IConfiguration config)
    {
        try
        {
            var secret = config["Jwt:Secret"] ?? "dev-secret";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(jwt, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidIssuer = config["Jwt:Issuer"] ?? "daypilot-api",
                ValidAudience = config["Jwt:Audience"] ?? "daypilot-app",
                ValidateIssuer = true,
                ValidateAudience = true,
                ClockSkew = TimeSpan.Zero
            }, out _);
            return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? principal.FindFirst("sub")?.Value;
        }
        catch
        {
            return null;
        }
    }

    public static string IssueJwt(User user, IConfiguration config)
    {
        var secret = config["Jwt:Secret"] ?? "dev-secret";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expMinutes = int.TryParse(config["Jwt:ExpirationMinutes"], out var m) ? m : 10080;
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("sub", user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(
            config["Jwt:Issuer"] ?? "daypilot-api",
            config["Jwt:Audience"] ?? "daypilot-app",
            claims,
            expires: DateTime.UtcNow.AddMinutes(expMinutes),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static IList<string> ValidateDiscoverRequest(DiscoverRequest request)
    {
        var errors = new List<string>();
        if (request.ConnectedAccountId.HasValue)
            return errors;
        if (string.IsNullOrWhiteSpace(request.AccessToken))
            errors.Add("accessToken is required.");
        else if (request.AccessToken.Length > 2000)
            errors.Add("accessToken must be at most 2000 characters.");
        if (request.RefreshToken != null && request.RefreshToken.Length > 2000)
            errors.Add("refreshToken must be at most 2000 characters.");
        return errors;
    }
}

internal sealed class DiscoverRequest
{
    public Guid? ConnectedAccountId { get; set; }

    [MaxLength(2000)]
    public string? AccessToken { get; set; }

    [MaxLength(2000)]
    public string? RefreshToken { get; set; }
}

internal sealed class RegisterRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? Name { get; set; }
}

internal sealed class LoginRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}
