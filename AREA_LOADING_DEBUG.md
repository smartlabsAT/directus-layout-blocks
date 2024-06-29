# Layout Blocks Area Loading Debug Guide

## Issue: Areas Not Loading from Interface Configuration

### Problem Description
The Layout Blocks interface is not loading the areas defined in the interface configuration. Instead, it's falling back to default areas or custom hardcoded areas.

### Root Causes Identified

1. **Temporary Override Flag**: The `USE_CUSTOM_AREAS` flag in `src/config/areas.ts` was set to `true`, which overrides any configured areas
2. **Props Not Being Passed**: Directus might not be passing the interface options correctly to the component

### Solution Steps

1. **Disable Custom Areas Override**
   ```typescript
   // src/config/areas.ts
   export const USE_CUSTOM_AREAS = false; // Changed from true
   ```

2. **Debug Logging Added**
   Enhanced logging has been added to `interface.vue` to trace area loading:
   - Props received
   - Options merging process
   - Area computation logic
   - Type checking for areas array

3. **Check Browser Console**
   When viewing a page with the Layout Blocks interface, check the browser console for:
   ```
   Interface: Computing areas...
   Interface: USE_CUSTOM_AREAS flag: false
   Interface: Raw props.options: {...}
   Interface: Options areas: [...]
   Interface: Using configured areas: [...]
   ```

### Configuration Verification

The field configuration should look like this:
```json
{
  "areas": [
    {
      "id": "A",
      "label": "A",
      "width": 100
    },
    {
      "id": "B", 
      "label": "B",
      "width": 100
    }
  ],
  "enableAreaManagement": true
}
```

### Testing Steps

1. **Rebuild the Extension**
   ```bash
   npm run build
   ```

2. **Clear Browser Cache**
   - Hard refresh the Directus admin panel
   - Clear browser cache if needed

3. **Check Field Configuration**
   Run the test script to verify the field configuration:
   ```bash
   node test-field-config.js
   ```

4. **Monitor Console Output**
   - Open browser developer tools
   - Navigate to a page with the Layout Blocks interface
   - Check console for area loading debug messages

### If Areas Still Don't Load

1. **Check Directus Version**: Ensure you're using a compatible version (10.x or 11.x)

2. **Verify M2A Relation**: The field must be properly configured as an M2A relation

3. **Check for Errors**: Look for any JavaScript errors in the browser console

4. **Restart Directus**: Sometimes a full restart is needed after extension changes
   ```bash
   docker-compose restart directus
   ```

5. **Manual Area Configuration**: As a temporary workaround, you can manually configure areas in `src/config/areas.ts` and set `USE_CUSTOM_AREAS = true`

### Debug Information to Collect

If the issue persists, collect this information:

1. Browser console output (all "Interface:" prefixed logs)
2. Network tab: Check the response for `/fields/[collection]/[field]`
3. Any JavaScript errors
4. Directus version: Check Admin Panel > Settings > About

### Contact Support

If none of the above solutions work, the issue might be:
- A bug in Directus's interface option passing
- A compatibility issue with your specific Directus version
- A configuration issue at the database level

Consider reporting this to the Directus community with the debug information collected above.