import { SPTheme } from '@servicenow/sdk/core'

SPTheme({
    $id: Now.ID['4b0f5d75b2004015bb9d0e42de6c3585'],
    name: 'Hands-On Lab Guide Theme',
    customCss: `// Carried over verbatim from the OOTB Coral theme (sp_theme 281507c44317d210ca4c1f425db8f2fd).
// Grays
$gray-base: #000000;
$gray-dark: sp-rgb(--now-color--neutral-16, #1D272B) !default;
$gray-darker: sp-rgb(--now-color--neutral-18, #10171A) !default;
$gray-light: sp-rgb(--now-color--neutral-9, #616D74) !default;
$gray-lighter: sp-rgb(--now-color--neutral-1, #F5F6F7) !default;
$gray: sp-rgb(--now-color--neutral-11, #3D4A50) !default;

////// Branding variables //////
// should always end with !default and no other variable should have !default
$brand-primary: sp-rgb(--now-color--primary-1, #0080A3) !default;
$body-bg: sp-rgb(--now-color_background--primary, #FFFFFF) !default;
$body-bg-tertiary: sp-rgb(--now-color_background--tertiary, #E2E5E7) !default;
$brand-success: sp-rgb(--now-color_alert--positive-3, #3E8600) !default;
$state-success-text: darken(desaturate(adjust-hue($brand-success, 3), 15.64%), 34.31) !default;
$sp-navbar-divider-color: sp-rgb(--now-color_divider--tertiary, #CFD5D7) !default;
$sp-navbar-bottom-width: 0.125rem !default;
$text-color: sp-rgb(--now-color_text--primary, #10171A) !default;
$navbar-inverse-link-hover-color: sp-rgb(--now-color_text--primary, #10171A) !default;
$navbar-inverse-bg: sp-rgb(--now-color_background--primary, #FFFFFF) !default;
$brand-warning: sp-rgb(--now-color_alert--warning-3, #B29800) !default;
$brand-danger: sp-rgb(--now-color_alert--critical-3, #E52239) !default;
$sp-tagline-color: sp-rgb(--now-color_text--primary, #10171A)!default;
$navbar-inverse-link-active-color: $sp-tagline-color !default;
$navbar-inverse-link-color: sp-rgb(--now-color_text--primary, #10171A) !default;
$brand-info: sp-rgb(--now-color_alert--info-3, #007AC9) !default;
$link-color: sp-rgb(--now-color--link-2, #1955BE);
$sp-logo-margin-x: 15px !default;
$text-muted: sp-rgb(--now-color_text--tertiary, #37444A) !default;
////////////////////////////////////

// Link hover decoration
$link-hover-decoration: underline !default;

// Background variables
$background-primary: sp-rgb(--now-color_background--primary, #FFFFFF);
$background-secondary: sp-rgb(--now-color_background--secondary, #F5F6F7);
$background-tertiary: sp-rgb(--now-color_background--tertiary, #E2E5E7);

//border-variables
$border-primary: sp-rgb(--now-color_border--primary, #737F84);
$border-secondary: sp-rgb(--now-color_border--secondary, #AAB2B6);
$border-tertiary: sp-rgb(--now-color_border--tertiary, #CFD5D7);

//selection variables
$selection-primary: sp-rgb(--now-color_selection--primary-0, #E0EADE) !default;
$selection-primary-darker: sp-rgb(--now-color_selection--primary-2, #2D7524) !default;

// text variable
$text-primary: sp-rgb(--now-color_text--primary, #10171A);
$text-secondary: sp-rgb(--now-color_text--secondary, #232E33) !default;
$text-tertiary: sp-rgb(--now-color_text--tertiary, #37444A);

// Coral variables
$brand-primary-dark: sp-rgb(--now-color--primary-2, #00566E) !default;
$brand-primary-darker: sp-rgb(--now-color--primary-3, #002D39) !default;
$brand-primary-light: sp-rgb(--now-color--interactive-1, #5EAFC5) !default;
$brand-primary-lighter: sp-rgb(--now-color--primary-0, #BDDEE7) !default;
$brand-primary-lightest: sp-rgb(--now-color--primary-0, #BDDEE7) !default;
$dropdown-link-disabled-color: $gray-light;
$link-hover-color: sp-rgb(--now-color--link-3, #113A82);
$navbar-inverse-link-active-bg: sp-rgb(--now-color_background--secondary, #F5F6F7);
$navbar-inverse-link-hover-bg: sp-rgb(--now-color--primary-0, #BDDEE7) !default;
$navbar-inverse-link-hover-border: sp-rgb(--now-color--primary-1, #0080A3) !default;
$navbar-inverse-link-focus-shadow: sp-rgba(--now-color_focus-ring, 0.5, #359325) !default;
$navbar-inverse-link-focus-ring: sp-rgb(--now-color_focus-ring, #359325) !default;
$panel-primary-border: $brand-primary;
$panel-primary-heading-bg: $brand-primary;
$panel-primary-text: sp-rgb(--now-color_text--primary-actionable, #FFFFFF) !default;
$primary: $brand-primary;
$input-border-focus: sp-rgb(--now-color--focus-ring, #359325) !default;
$quicklinks-background: sp-rgb(--now-color_surface--brand-2, #B8DBE5) !default;
$btn-success-bg: $brand-success;
$btn-default-bg: $background-primary;
$btn-default-color: $brand-primary-dark;
$btn-default-border: sp-rgb(--now-color_border--tertiary, #CFD5D7) !default;
$btn-primary-color: sp-rgb(--now-color_text--primary-actionable, #FFFFFF) !default;
$btn-primary-bg: $brand-primary-dark;
$btn-primary-border: $brand-primary-dark;
$btn-secondary-color-hover: $brand-primary-darker !default;
$btn-secondary-bg-hover: sp-rgba(--now-color_background--secondary-actionable, 0.1, #232E33) !default; // hover with 10% opacity
$btn-secondary-border-hover: sp-rgb(--now-color_border--secondary-actionable, #4F5C62) !default;
$btn-success-bg: $brand-success;
$btn-success-border: $brand-success;
$btn-success-color: $btn-primary-color;
$btn-disabled-opacity: 0.25;
$btn-clear-bg: transparent;
$btn-clear-text: $text-tertiary;
$component-active-color: $gray;
$component-active-bg: sp-rgb(--now-color_background--secondary, #F5F6F7) !default;
$state-danger-bg: sp-rgb(--now-color_alert--critical-0, #F9C8CE) !default;
$state-danger-border: $brand-danger;
$state-danger-text: $brand-danger;
$state-info-bg: sp-rgb(--now-color_alert--info-0, #BDDCF1) !default;
$state-info-border: $brand-info;
$state-info-text: $text-color;
$state-success-bg: sp-rgb(--now-color_alert--positive-0, #C7DCB5) !default;
$state-success-border: $brand-success;
$state-warning-bg: sp-rgb(--now-color_alert--warning-0, #ECE5BF) !default;
$state-warning-border: $brand-warning;
$state-warning-text: $text-color;
$alert-danger-bg: sp-rgb(--now-color_alert--critical-0, #F9C8CE) !default;
$alert-danger-border: sp-rgb(--now-color_alert--critical-1, #F2919C) !default;
$alert-danger-text: $text-color;
$alert-info-bg: sp-rgb(--now-color_alert--info-0, #BDDCF1) !default;
$alert-info-border: sp-rgb(--now-color_alert--info-1, #7DBBE3) !default;
$alert-info-text: $text-color;
$alert-success-bg: sp-rgb(--now-color_alert--positive-0, #C7DCB5) !default;
$alert-success-border: sp-rgb(--now-color_alert--positive-1, #99BF78) !default;
$alert-success-text: $text-color;
$alert-warning-bg: sp-rgb(--now-color_alert--warning-0, #ECE5BF) !default;
$alert-warning-border: sp-rgb(--now-color_alert--warning-1, #FFEA72) !default;
$alert-warning-text: $text-color;

// To get service status messages consistent with brand colors
$primary: $brand-primary;
$warning: $brand-warning;
$success: $brand-success;
$info: $brand-info;
$danger: $brand-danger;
$input-border-placeholder: white;


// Service Catalog panel hover highlight
$panel-list-item: $brand-primary-lighter;
$panel-primary-heading-bg: $brand-primary;
$panel-default-text: sp-rgb(--now-color_alert--low-3, #757681) !default;

$carousel-text-shadow: none !default;
$carousel-control-color: $text-muted;

$multiple-issues-color: #7B56FF !default;//sp-rgb(--now-color_alert--moderate-3, #7B56FF) !default;
$no-issue-color: $state-success-bg;
$planned-maintenance-color: sp-rgb(--now-color_alert--info-0, #BDDCF1) !default;
$service-degredation-color: $state-warning-bg;
$service-outage-color: $state-danger-bg;

$no-issue-border-color: $brand-success;
$planned-maintenance-border-color: $brand-info;
$service-degredation-border-color: $brand-warning;
$service-outage-border-color: sp-rgb(--now-color_alert--critical-2, #EC596B) !default;

$no-issues-text: $state-success-text;
$planned-maintenance-text: $panel-primary-text;
$service-degredation-text: $state-info-text;
$service-outage-text: $panel-primary-text;

$login-btn-bg: $btn-primary-bg;
$login-btn-border: $btn-primary-border;
$login-mask-btn-bg: sp-rgb(--now-form-field--background-color, #FFFFFF);

$qa-tag-color: $state-info-text;
$qa-tag-bg: $state-info-bg;
$qa-tag-border: $state-info-bg;
$qa-tag-hover-color: $gray-base;
$qa-tag-hover-bg: $gray-base;

$qa-thread-tag-color: $state-info-text;
$qa-thread-tag-bg: $state-info-bg;
$qa-thread-tag-hover-color: $gray-base;
$qa-thread-tag-hover-bg: $gray-base;

$qa-panel-link-color: $link-color;
$select2-container-active: $input-border-focus;
$select2-hover-color:sp-rgb(--now-color_focus-ring, #248A13);

$not-webkit-outline-color: $input-border-focus;
$webkit-outline-color: $input-border-focus;

$label-success-bg: $no-issue-color;
$label-info-bg: $planned-maintenance-color;
$label-warning-bg: $service-degredation-color;
$label-danger-bg: $service-outage-color;
$label-primary-bg : $brand-danger;
$data-table-selected: sp-rgb(--now-color--primary-0, #BDDEE7) !default;

$button-selected-color: $btn-primary-bg;
$dropdown-link-active-bg: $brand-primary;
$dropdown-link-active-color: #ffffff;
$widget-editor-fa-bg: $brand-primary;

$input-border-tab-focus: $input-border-focus;

$fav-star-color: sp-rgb(--now-color_text--tertiary, #37444A);
$fav-star-color-off: sp-rgb(--now-color_text--primary-actionable, #FFFFFF) !default;
$fav-star-outline-color: $text-muted;
$fav-star-outline: -1px 0 $fav-star-outline-color, 0 1px $fav-star-outline-color, 1px 0$fav-star-outline-color, 0 -1px $fav-star-outline-color;

$sc-field-error-color: $brand-danger;
$sc-field-error-text-color: sp-rgb(--now-color_text--primary-actionable, #FFFFFF);
$qa-star-color-on: $brand-warning;
$qa-star-color-off: #ffffff;

$list-group-hover-bg: $brand-primary-lighter;

$accessible-placeholder-gray: #565656;

$sp-navbar-toggle-border-color: rgba($navbar-inverse-link-hover-color, 0.25);
//We lack a UXF-specific search-highlight color, so we use the mark tag's default highlight color(suggested by design).
$sp-search-results-highlight-color: #FFFF00; //sp-rgb(--now-datavis_color--yellow-1, #FFE1A3);
$sp-faceted-search-interactive-color: sp-rgb(--now-color--link-2, #1955BE);
$sp-b-border-color: $border-tertiary;

$sp-now-tabs-color: sp-rgb(--now-color_text--primary, #10171A);
$sp-now-tabs-color-selected: sp-rgb(--now-color_selection--primary-2, #2D7524);
$sp-now-tabs-color-hover: sp-rgb(--now-color_selection--primary-3, #22581B);
$sp-now-tabs-border-color-hover: sp-rgb(--now-color_divider--tertiary, #CFD5D7);
$sp-now-tabs-color-active: sp-rgb(--now-color_selection--primary-4, #173B12);
$sp-now-tabs-selected-border-color: $sp-now-tabs-color-selected;

$sp-agent-chat-bg: $brand-primary;
$sc-field-error-label-color: sp-rgb(--now-color_alert--critical-3, #E52239) !default;
$sp-sc-category-list-badge-color: $panel-default-text;
$sp-sc-accordion-hover: #F1F2F3 !default;//sp-rgb(--now-color_surface--neutral-2, #F1F2F3);
$sc-sticky-item-header-bg: $body-bg;
$input-border: sp-rgb(--now-color_border--primary, #737F84) !default;

// status background colors
$brand-success-2: sp-rgb(--now-color_alert--positive-2, #6CA33D) !default;
$brand-warning-2: sp-rgb(--now-color_alert--warning-2, #C5B240) !default;
$brand-danger-2: sp-rgb(--now-color_alert--critical-2, #EC596B) !default;
$brand-info-2: sp-rgb(--now-color_alert--info-2, #409BD7) !default;
$sp-status-danger: $brand-danger-2;
$sp-status-warning: $brand-warning-2;
$sp-status-info: $brand-info-2;

//kb variables
$kb-title-color: sp-rgb(--now-color--interactive-2, #0080A3) !default;
$panel-default-text-color: $text-color !default;
$kb-main-search-color: $panel-primary-text !default;
$transparent-button-color: $brand-primary-dark !default;
$panel-inner-border: $border-tertiary;
$panel-default-border: $border-tertiary;
$kb-title-color: sp-rgb(--now-color--primary-2, #ffffff);;
$kb-border: $border-tertiary;
$kb-article-view-link-color: $link-color;
$kb-article-view-link-color-hover: $link-hover-color;
$kb-create-comment-bg: $body-bg;
$color-lightest: $panel-primary-text;

$sp-status-success: $brand-success-2;
$sp-status-success-bg: $state-success-bg;
$sp-status-warning-bg: $state-warning-bg;
$sp-status-info-bg: $state-info-bg;
$sp-status-danger-bg: $state-danger-bg;
$survey-btn-default-border: $brand-primary;
$sp-sc-accordion-hover: sp-rgb(--now-color_surface--neutral-2, #F1F2F3);
// standard ticket tab, tab colors;

$default-icon: $text-color !default;
$primary-icon: $brand-primary-dark !default;

$panel-heading-background: $body-bg !default;
$panel-heading-color: $text-color !default;
$panel-heading-icon-color: $text-color !default;
$panel-box-shadow: 0 .4rem .8rem 0 rgba(56, 56, 56, 0.25) !default;
$panel-border-color: $border-tertiary !default;

$timeline-badge-success: sp-rgb(--now-color_alert--positive-3, #3E8600) !default;

$success-icon-color: $brand-success;
$info-icon-color: $brand-info;
$warning-icon-color: $brand-warning;

$no-issue-dark-border-color: $sp-status-success;
$planned-maintenance-dark-border-color: $sp-status-info;
$service-degredation-dark-border-color: $sp-status-warning;

$no-issue-background-color: $brand-success;
$planned-maintenance-background-color: $brand-info;
$service-degredation-background-color: $brand-warning;
$service-outage-background-color: $brand-danger;
$sp-page-bg: sp-rgb(--now-color_background--secondary, #F5F6F7);

// SP Attachment Handler
$btn-interactive: sp-rgb(--now-color--interactive-2, #0080A3);
$attachment-icon-color: sp-rgb(--now-color--link-2, #1955BE);
$sp-file-drop-zone-color: $text-secondary;

// Checkbox
$checkbox-selection-color: sp-rgb(--now-color_selection--secondary-2, #00718f);

// Data Table Selected Color
$sp-list-cell-color-selected: $link-color;

// Announcement Title Color
$sp-announcement-title-color: $text-color;
$sp-dropdown-menu-options-color: sp-rgb(--now-color--interactive-2, #0080A3) !default;
$sp-homepage-bg: $component-active-bg;
$panel-focus: sp-rgb(--now-color--focus-2, #359325) !default;
$input-color: $text-color;

$sp-clear-all-color: $brand-primary;
$search-list-item-focus: #dddddd;
$table-heading: sp-rgb(--now-color_text--primary, #10171A) !default;
$sp-loading-color: sp-rgb(--now-color--primary-1, #0080A3) !default;
$sp-sc-category-list-hover-color: $link-color;

// Avatar Colors
$sp-avatar-border-color: sp-rgb(--now-color_border--tertiary, #CFD5D7);
$sp-avatar-text-color: $text-secondary;
$sp-focus-border-color: sp-rgb(--now-color_text--primary-actionable, #FFFFFF) !default;

$now-sp-dropdown-list--background-color: sp-rgb(--now-color_background--primary, #FFFFFF) !default;
$now-sp-dropdown-list--color: $text-color;
$now-sp-dropdown-list--border-color: sp-rgb(--now-color_border--tertiary, #CFD5D7;) !default;
$now-sp-dropdown-list--color--focus: $text-color;
$now-sp-dropdown-list--background-color--focus: sp-rgb(--now-color--primary-0, #BDDEE7) !default;
$now-sp-genius-card--background: sp-rgb(--now-color_background--primary, #FFFFFF) !default;
$now-sp-carousel-background-color: sp-rgb(--now-color_background--primary, #FFFFFF) !default;

$now-sp-text-link--primary--color: sp-rgb(--now-color--link-2, #1955BE);
$now-sp-text-link--primary--color--hover: sp-rgb(--now-color--link-3, #113A82);
$now-sp-text-link--primary--color--active: sp-rgb(--now-color--link-3, #113A82);
$sp-clear-all-color: $link-color;
$sp-nav-tabs-active-font-weight: normal;
$sp-nav-tabs-hover-font-weight: normal;
$sp-nav-tabs-border-bottom-width: 2px;
$sp-nav-tab-border-radius: 0;
$sp-nav-tabs-color: sp-rgb(--now-color_text--primary, #10171A);
$sp-nav-tabs-hover-color: sp-rgb(--now-color_selection--primary-4, #173B12);
$sp-nav-tabs-active-tab: sp-rgb(--now-color_selection--primary-3, #22581B);
$sp-nav-tabs-focus-box-shadow: inset 0 0 0 2px sp-rgb(--now-color--focus-2, #359325) !default;
$sp-nav-tabs-hover-bg: transparent;
$nav-tabs-border-color: sp-rgb(--now-color_divider--tertiary, #CFD5D7) !default;
$nav-tabs-link-hover-border-color: transparent;
$nav-tabs-active-link-hover-bg: transparent;
$nav-tabs-active-link-hover-color: sp-rgb(--now-color_selection--primary-3, #22581B);
$nav-tabs-active-link-hover-border-color: sp-rgb(--now-color_selection--primary-4, #173B12) !default;
$org-background-primary: sp-rgb(--now-color_background--primary, #FFFFFF) !default;
$org-background-secondary: sp-rgb(--now-color_background--secondary, #F5F6F7) !default;
$org-background-tertiary: sp-rgb(--now-color_background--tertiary, #E2E5E7) !default;
$org-border-tertiary: sp-rgb(--now-color_border--tertiary, #CFD5D7) !default;
$org-text-primary: $text-color;

$modal-content-bg: $background-primary;
$modal-content-border-color: $border-tertiary;
$modal-content-fallback-border-color: $border-tertiary;
$modal-header-close-color: $text-primary;
$panel-default-heading-bg: $background-secondary;

// link icon variable
$icon-link-glyph-color: sp-rgb(--now-color_text--primary-actionable, #FFFFFF);

//Form
$sp-form-field--background-color: sp-rgb(--now-form-field--background-color, #FFFFFF);
$sp-form-field--background-color--readonly: sp-rgb(--now-form-field--background-color--readonly, #DCE0E2);
$sp-form-field-placeholder: $text-tertiary;

$table-bg: transparent;
$table-bg-accent: $background-secondary;
$table-bg-hover: $component-active-bg;
$table-border-color: $border-tertiary;

$dropdown-link-color: $text-primary;
$dropdown-link-hover-color: $text-primary;
$dropdown-link-hover-bg: $background-secondary;

$dropdown-bg: $background-primary;
$dropdown-border: $border-tertiary;
$dropdown-fallback-border: $border-tertiary;
$dropdown-divider-bg: $dropdown-border;

// Catalog
$well-bg: sp-rgb(--now-color_text--tertiary-actionable, #E2E5E7);
$panel-info-heading-bg: $brand-primary-lighter;
$sp-sc-category-list-hover-color: sp-rgb(---now-color--Primary-4, #FFFFFF);
$panel-bg: $background-primary;
$nav-tabs-justified-link-border-color: $border-tertiary;
$list-group-link-heading-color: $text-tertiary;
$category-view-toggle-color: $text-tertiary;
$sc-label-color: $text-tertiary;

// Profile Popover
$popover-bg: $body-bg;
$popover-border-color: $border-tertiary;;
$popover-arrow-color: $body-bg;
$popover-arrow-outer-color: $border-tertiary;

// Service status
$status-table-heading: $table-heading;

//AIS
$now-sp-display-type--secondary--color: sp-rgb(--now-display-type--secondary--color, #10171A);
$now-sp-label-value-inline--color: sp-rgb(--now-label-value-inline--color, #FFFFFF);
$now-sp-color--text-primary: sp-rgb(--now-color_text--primary, #10171A);
$now-sp-heading--title-primary--color: sp-rgb(--now-heading--title-primary--color, #10171A);
$now-sp-color-text-tertiary: sp-rgb(--now-color_text--tertiary, #FFFFFF);
$now-button-iconic--bare--tertiary--background-color--hover: sp-rgb(--now-button-iconic--bare_tertiary--background-color--hover, #FFFFFF);
$now-button-iconic--bare--tertiary--color--hover: sp-rgb(--now-button-iconic--bare_tertiary--color--hover, #FFFFFF);

//Tooltip
$tooltip-bg: sp-rgb(--now-color--neutral-19, #0B1012);
$tooltip-color: sp-rgb(--now-color--neutral-0, #FFFFFF);
$tooltip-arrow-color: $text-primary;
$tooltip-border-color: $text-primary;

$input-group-addon-bg: $background-primary;`,
    header: '2acb2ce7c0814fba803d007946da2c9f',
    matchingNextExperienceTheme: 'fad87d2ca304121029a4d1aed31e610f',
})
