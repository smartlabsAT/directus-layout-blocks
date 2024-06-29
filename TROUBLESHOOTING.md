# Layout Blocks Troubleshooting Guide

## Common Issues and Solutions

### 1. No Collections Appearing in Block Creator

**Problem**: When clicking "Add Block", the dropdown shows no collections or is disabled.

**Possible Causes & Solutions**:

1. **M2A Field Not Configured with Collections**
   - When creating the M2A field, ensure you select the collections you want to relate
   - Check the console for debug messages about allowed collections

2. **Collections Not Detected from M2A Configuration**
   - The extension searches multiple locations for allowed collections:
     - Field metadata: `meta.one_allowed_collections`
     - Relation metadata: `meta.one_allowed_collections` 
     - Junction table collection field: `schema.enum` or `meta.options.choices`
   - Check browser console for debug output showing where collections are being searched

3. **Fallback Collections**
   - If no collections are detected, the extension will use default content block collections
   - You can manually configure collections in the interface options

### 2. "Field is not a M2A relation" Error

**Problem**: Interface shows error that the field is not properly configured as M2A.

**Solution**:
1. Delete the current field
2. Create a new field with type "Many to Any (M2A)"
3. Select the collections you want to relate
4. THEN choose "Layout Blocks" as the interface

### 3. Collections Showing "junction" or "related"

**Problem**: The allowed collections dropdown shows placeholder values instead of actual collections.

**Solution**: 
- These are filtered out automatically in the latest version
- If still appearing, check that the M2A field was created properly through the UI

### 4. Debugging Steps

To debug collection detection issues:

1. **Open Browser Console** (F12)
2. **Look for Debug Messages**:
   ```
   Layout Blocks Interface: Loading extension
   Options: Found allowed collections: [...]
   Options: Field meta details: {...}
   Interface: Computing allowed collections...
   BlockCreator: Computing available collections...
   ```

3. **Check Junction Detection**:
   ```
   Detecting junction structure for [collection].[field]
   Junction collection fields: [...]
   ```

4. **Verify M2A Configuration**:
   - The junction table should have these fields:
     - Foreign key to parent (e.g., `pages_id`)
     - `collection` (string) - stores collection name
     - `item` (string/uuid) - stores related item ID
     - `area` (string) - for layout organization
     - `sort` (integer) - for ordering

### 5. Manual Configuration

If automatic detection fails, you can manually configure allowed collections:

1. In the interface options, look for "Allowed Collections"
2. Select the collections you want to use as blocks
3. Save the field configuration

### 6. API Endpoints for Debugging

Check these endpoints to understand your M2A structure:

```bash
# Get field information
GET /fields/[collection]/[field]

# Get relations
GET /relations?filter[collection][_eq]=[collection]

# Get junction table fields
GET /fields/[junction_collection]
```

### 7. Console Commands

To inspect the configuration via console:

```javascript
// Get all relations for a collection
const relations = await api.get('/relations', {
  params: { filter: { collection: { _eq: 'your_collection' } } }
});
console.log(relations.data.data);

// Get field configuration
const field = await api.get('/fields/your_collection/your_field');
console.log(field.data.data.meta);
```

## Need More Help?

If issues persist:
1. Check the Directus logs: `docker-compose logs directus`
2. Verify the M2A field is properly created in the database
3. Ensure all required permissions are granted
4. Try creating a fresh M2A field with Layout Blocks interface