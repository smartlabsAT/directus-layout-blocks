// Temporary area configuration
// Since Directus is not passing the options correctly,
// you can define your areas here temporarily

export const CUSTOM_AREAS = [
  {
    id: 'header',
    label: 'Header',
    icon: 'vertical_align_top',
    width: 100
  },
  {
    id: 'left',
    label: 'Left Sidebar', 
    icon: 'west',
    width: 50
  },
  {
    id: 'right',
    label: 'Right Sidebar',
    icon: 'east', 
    width: 50
  },
  {
    id: 'main',
    label: 'Main Content',
    icon: 'inbox',
    width: 100
  },
  {
    id: 'footer',
    label: 'Footer',
    icon: 'vertical_align_bottom',
    width: 100
  }
];

// Set to true to use custom areas instead of options
export const USE_CUSTOM_AREAS = false;