namespace DayPilot.Api.Models;

public class ConnectedAccount
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Provider { get; set; } = "google";
    public string ProviderAccountId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public string? Scope { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
