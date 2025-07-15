# How to Use Layout Blocks Interface

## Important: Layout Blocks is NOT a standalone field!

Layout Blocks is an **interface** for Many-to-Any (M2A) relationships. You cannot create a Layout Blocks field directly.

## Step-by-Step Setup

### 1. Create a Many-to-Any (M2A) Field

1. Go to your collection (e.g., `pages`, `content_blocks`)
2. Click "Create Field"
3. Choose **"Many to Any (M2A)"** as the field type
4. Give it a name (e.g., `blocks`, `content_blocks`, `page_sections`)
5. **Important**: Select which collections you want to relate:
   - For example: `hero_sections`, `text_blocks`, `image_galleries`, etc.
   - These are the collections that will be available as block types

### 2. Configure the M2A Relationship

1. Directus will automatically create a junction table
2. Configure the relationship settings:
   - **Display Template**: How items should be displayed
   - **Hidden**: Whether to hide the field in the item detail page

### 3. Select Layout Blocks as the Interface

1. After creating the M2A field, go to the "Interface" tab
2. Select **"Layout Blocks"** from the interface options
3. Configure the Layout Blocks settings:
   - **Areas**: Define layout areas (main, sidebar, footer, etc.)
   - **Enable Drag & Drop**: Allow reordering blocks
   - **Auto Setup**: Automatically add area and sort fields

### 4. Save and Use

1. Save the field configuration
2. The Layout Blocks interface will now be available when editing items
3. You can drag and drop blocks between areas and reorder them

## Common Mistakes

### ❌ Wrong: Creating Layout Blocks as a standalone field
```
1. Create Field > Choose "Layout Blocks" ❌
```

### ✅ Correct: Creating M2A field first, then choosing Layout Blocks
```
1. Create Field > Choose "Many to Any (M2A)" ✅
2. Select related collections ✅
3. Choose "Layout Blocks" as interface ✅
```

## Example Use Case

For a CMS page builder:

1. Create collections for different content types:
   - `hero_sections` (with fields: title, subtitle, image, cta_button)
   - `text_blocks` (with fields: heading, content, alignment)
   - `image_galleries` (with fields: images, layout, caption)
   - `video_embeds` (with fields: video_url, thumbnail, autoplay)

2. In your `pages` collection:
   - Create M2A field called `content_blocks`
   - Select all the content collections as related
   - Choose "Layout Blocks" as the interface

3. Configure areas:
   - `hero` - For hero sections at the top
   - `main` - For main content
   - `sidebar` - For sidebar content
   - `footer` - For footer blocks

Now editors can visually build pages by dragging different block types into different areas!

## Troubleshooting

### "No junction collection found"
This means the M2A field wasn't properly created. Delete the field and follow the steps above.

### "Field is not a M2A relation"
You tried to use Layout Blocks on a wrong field type. It only works with M2A relationships.

### Interface not showing up
Make sure you:
1. Created a M2A field (not any other type)
2. Selected at least one related collection
3. Saved the field before selecting the interface