# Production Deployment Checklist

Use this checklist to ensure everything is set up correctly before going live.

## Pre-Deployment

### Environment Setup
- [ ] Production Supabase project created
- [ ] All database migrations run on production
- [ ] RLS policies verified
- [ ] Resend account created and domain verified
- [ ] Environment variables documented

### Code Quality
- [ ] All tests passing (if applicable)
- [ ] Linting passes: `pnpm lint`
- [ ] Type checking passes: `pnpm type-check`
- [ ] Build succeeds: `pnpm build`
- [ ] No console errors in browser
- [ ] No TypeScript errors

### Security
- [ ] No API keys committed to repository
- [ ] Environment variables set in hosting platform
- [ ] RLS policies tested
- [ ] Authentication flow tested
- [ ] HTTPS enabled (automatic on Vercel/Netlify)

## Deployment

### Frontend
- [ ] Deployed to hosting platform (Vercel/Netlify)
- [ ] Environment variables configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Build artifacts correct

### Backend (Supabase)
- [ ] Edge Functions deployed
- [ ] Secrets configured (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
- [ ] Database migrations applied
- [ ] RLS policies active

### Cron Jobs
- [ ] Reminder cron job configured (pg_cron or GitHub Actions)
- [ ] Cron job tested and running
- [ ] Monitoring set up for cron failures

## Post-Deployment Testing

### Authentication
- [ ] User signup works
- [ ] User login works
- [ ] Password reset works (if implemented)
- [ ] Protected routes require authentication

### Core Features
- [ ] Calendar view loads
- [ ] Events can be created
- [ ] Events can be edited
- [ ] Events can be deleted
- [ ] Recurring events work
- [ ] Timezone handling correct

### Booking System
- [ ] Booking links can be created
- [ ] Availability rules work
- [ ] Excluded dates work
- [ ] Public booking page accessible
- [ ] Time slots calculated correctly
- [ ] Bookings can be submitted
- [ ] Booking confirmation emails sent

### Notifications
- [ ] Reminder emails sent on schedule
- [ ] Booking confirmation emails sent
- [ ] Email templates render correctly
- [ ] Email delivery successful

### Organizations
- [ ] Organizations can be created
- [ ] Members can be added
- [ ] Permissions work correctly
- [ ] Organization calendars work

## Monitoring & Analytics

### Error Tracking
- [ ] Error tracking service configured (Sentry, etc.)
- [ ] Error alerts set up
- [ ] Edge Function errors monitored

### Analytics
- [ ] Analytics service configured (PostHog, etc.)
- [ ] Key events tracked
- [ ] User behavior tracked

### Performance
- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Edge Function execution times monitored
- [ ] Database query performance acceptable

## Documentation

- [ ] README updated
- [ ] Deployment guide complete
- [ ] Environment variables documented
- [ ] API documentation (if applicable)
- [ ] User documentation (if applicable)

## Backup & Recovery

- [ ] Database backups configured
- [ ] Backup restoration tested
- [ ] Rollback procedure documented
- [ ] Disaster recovery plan in place

## Final Checks

- [ ] All features tested in production
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Legal compliance (GDPR, etc.) verified
- [ ] Terms of service and privacy policy (if applicable)

## Launch

- [ ] Announcement prepared
- [ ] Support channels ready
- [ ] Monitoring dashboards set up
- [ ] Team notified
- [ ] Launch! 🚀

## Post-Launch

- [ ] Monitor error rates
- [ ] Monitor user signups
- [ ] Monitor email delivery rates
- [ ] Gather user feedback
- [ ] Plan improvements

---

**Last Updated**: After notification system implementation
**Next Review**: Before production launch
