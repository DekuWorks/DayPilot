using Microsoft.EntityFrameworkCore;
using DayPilot.Api.Models;

namespace DayPilot.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<ConnectedAccount> ConnectedAccounts => Set<ConnectedAccount>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.GoogleId).IsUnique().HasFilter("[GoogleId] IS NOT NULL");
        });

        modelBuilder.Entity<ConnectedAccount>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.Provider, x.ProviderAccountId }).IsUnique();
        });
    }
}
