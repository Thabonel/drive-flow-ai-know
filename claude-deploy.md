# Claude Deployment Workflow

## Staging Process

1. **Development**: Make changes on staging branch
   ```bash
   git checkout staging
   # Make changes
   git add -A
   git commit -m "description"
   git push origin staging
   ```

2. **Testing**: User tests on staging environment

3. **Production**: After user approvals, run deployment script
   ```bash
   ./deploy-to-production.sh
   # User must type "yes" to confirm
   ```

## For Claude Sessions

When user wants to deploy to production:

1. **Check current branch**: `git branch --show-current`
2. **Run deployment script**: `./deploy-to-production.sh`
3. **Wait for user confirmation**: Script requires typing "yes"
4. **Verify deployment**: Check production is updated

## Important Notes

- Always commit to staging first
- User must test before production deployment
- Production deployment requires explicit "yes" confirmation
- Script handles the merge from staging to main safely
- Never push directly to main without this process