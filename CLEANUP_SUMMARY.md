# Cleanup Summary

## Files/Folders Removed

1. **`harperdb/functions/`** - Removed (duplicate of `custom_functions/`)
   - All custom functions are now in `custom_functions/` folder
   - These are auto-deployed by HarperDB

2. **`scripts/bootstrap.ts`** - Removed (duplicate)
   - Kept `scripts/bootstrap.js` for optional command-line setup
   - Recommended to use HarperDB Studio instead

## Current Structure

```
pylomarket/
├── apps/web/              # Next.js app
├── custom_functions/       # ✅ Active: Auto-deployed custom functions
├── harperdb/schema/       # 📋 Reference: Schema definitions (optional)
├── scripts/bootstrap.js   # 📋 Optional: CLI bootstrap (use Studio instead)
└── docker-compose.yml     # ✅ Active: Docker configuration
```

## Workflow

1. **Custom Functions**: Place in `custom_functions/` → Auto-deployed by HarperDB
2. **Schema Management**: Use HarperDB Studio (recommended) or bootstrap script
3. **API Routes**: Call custom functions via `harperdb-functions.ts` helpers

## Notes

- `harperdb/schema/tables.json` is kept as reference only
- `scripts/bootstrap.js` is kept for those who prefer CLI, but Studio is recommended
- All active custom functions are in `custom_functions/` folder
