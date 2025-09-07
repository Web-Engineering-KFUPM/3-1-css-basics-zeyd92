[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/AmqNvXqN)
# SocialBook - CSS Selectors Practice Demo

## Overview

This demo guides you through styling a simple social media app called "SocialBook" while practicing CSS selectors and understanding CSS specificity. You'll learn how to target different social media elements using various selector types and see how CSS specificity determines which styles are applied when multiple rules target the same element.

## What You'll Learn

* **Basic Selectors**: Element, class, and ID selectors for social media components
* **CSS Specificity**: How browsers decide which styles to apply in conflicts
* **Advanced Selectors**: Descendant selectors and pseudo-classes for interactive elements
* **Group Selectors**: Styling multiple similar elements efficiently
* **!important Override**: When and how to override specificity

## Prerequisites

* Basic understanding of HTML structure
* Any modern web browser (Chrome, Firefox, Safari, Edge)
* A text editor (VS Code, Sublime Text, Notepad++)

## Files

* `index.html`: Complete social media app structure with posts, profiles, and messages
* `styles.css`: Starter CSS file with TODOs to complete
* `README.md`: This instruction file

## Instructions

### Step 1: Set Up the Project

1. Open `index.html` in your text editor
2. Complete the TODO comment:
   - Link the external CSS file in the `<head>`

### Step 2: Complete the CSS TODOs

Open `styles.css` and complete each TODO section to style your social media app:

#### TODO 1: Basic Element Selectors
```css
/* Style all paragraphs (posts and messages) */
p {
    color: #333;
    font-size: 16px;
}

/* Style all span elements (timestamps) */
span {
    color: #888;
    font-size: 14px;
}
```

#### TODO 2: Class Selectors
```css
/* Style usernames */
.username {
    color: #1877f2;
    font-weight: bold;
}

/* Style blue post text */
.blue-text {
    color: #4267B2;
}

/* Style red post text */
.red-text {
    color: #e74c3c;
}

/* Style highlighted/pinned posts */
.highlight {
    background-color: #f0f2f5;
    padding: 15px;
}
```

#### TODO 3: ID Selectors
```css
/* Style the featured user */
#featured-user {
    color: #42b883;
    font-size: 18px;
}
```

#### TODO 4: Specificity Battle
Create multiple rules targeting the same profile bio to see which wins:
```css
p { color: #333; }                    /* Specificity: 0-0-1 */
.winner { color: #ff6b6b; }           /* Specificity: 0-1-0 */
#specificity-test { color: #4ecdc4; }  /* Specificity: 1-0-0 */
p.winner { color: #95a5a6; }          /* Specificity: 0-1-1 */
```

#### TODO 5: !important Override
```css
.important-test {
    color: #e67e22 !important;
}
```

#### TODO 6: Descendant Selectors
```css
/* Style messages inside chat containers */
.chat-container .message {
    color: #2c3e50;
}

/* Style message timestamps */
.chat-container .message-time {
    color: #7f8c8d;
    font-size: 12px;
}
```

#### TODO 7: Pseudo-classes
```css
/* Style send button on hover */
.send-button:hover {
    background-color: #3b5998;
    color: white;
}

/* Style chat links on hover */
.chat-link:hover {
    color: #1877f2;
    text-decoration: none;
}
```

#### TODO 8: Group Selectors
```css
/* Style trending hashtags */
h4.trending-tag, h5.trending-tag, h6.trending-tag {
    color: #8b9dc3;
    font-family: Arial;
}
```

#### TODO 9: Universal Selector
```css
* {
    box-sizing: border-box;
}
```

### Step 3: Test Your Social Media App

1. Save both files
2. Open `index.html` in your browser
3. Check that all social media elements are styled correctly
4. Test hover effects on buttons and links

## Expected Results

After completing all TODOs, your SocialBook app should look like this:

### 📱 Complete App Overview
![Complete SocialBook App](ref/1.png)

Your fully styled social media app should have:

* **Header**: Purple gradient background with white text
* **Navigation**: Blue navigation bar with hover effects
* **News Feed**: Styled posts with proper colors and spacing
* **Profile Section**: CSS specificity demonstration
* **Messages**: Chat interface with interactive elements
* **Trending**: Consistently styled hashtags

### 🎯 Key Visual Elements

![Header and Navigation](ref/2.png)

**Header & Navigation Features**:
- Gradient header background
- Clean navigation with hover states
- Proper spacing and typography

![Content Sections](ref/3.png)

**Content Areas Should Show**:
* **News Feed Section**: 
  - Posts with proper text colors and highlighted pinned posts
  - Usernames in social media blue (#1877f2)
  - Timestamps in muted gray
  - Featured user with special green styling

* **Profile Section**:
  - Bio text color determined by CSS specificity (should be **teal/cyan** from ID selector)
  - !important override test showing **orange** text (overrides inline blue)

* **Messages Section**:
  - Chat messages with proper descendant styling
  - Send button that changes color on hover
  - Chat links that lose underline and change color on hover

* **Trending Section**:
  - Hashtag topics styled consistently with group selectors

## Understanding CSS Specificity in Social Media Context

CSS specificity determines which styles apply when multiple rules target the same element:

1. **Inline styles** (style="...") - Highest priority (like admin overrides)
2. **IDs** (#featured-user) - High priority (unique users/elements)
3. **Classes** (.username, .post) - Medium priority (groups of elements)
4. **Elements** (p, div, span) - Low priority (base styling)
5. **!important** - Overrides everything (emergency use only!)

**Real-world Example**:
- All paragraphs get basic styling
- Post text gets class-specific colors
- Featured user bio gets ID-specific styling (wins over classes)
- Admin messages might use !important for critical styling

## Social Media Elements You're Styling

* **Posts**: User-generated content with usernames, text, and timestamps
* **Profile Cards**: User information and bio sections
* **Messages**: Chat interface with sent/received message styling
* **Navigation**: Social media app navigation bar
* **Trending**: Hashtag and topic sections

## Common Social Media Styling Patterns

1. **User Hierarchy**: Different colors for different user types (regular, verified, admin)
2. **Content States**: Highlighting pinned posts, unread messages, etc.
3. **Interactive Elements**: Hover effects on buttons and links
4. **Responsive Design**: Adapting to different screen sizes

## Troubleshooting

* **Styles not appearing?** Check the CSS file is linked correctly
* **Colors not matching?** Verify selector syntax (dots for classes, hashes for IDs)
* **Hover effects not working?** Make sure you're hovering over the correct elements
* **Wrong colors in profile section?** Review CSS specificity rules - ID should win

## Project Structure

```
1.3 css selectors/
├── index.html          # SocialBook app HTML structure
├── styles.css          # CSS file with social media styling TODOs
└── README.md           # This instruction file
```

## Next Steps

* Add more interactive states (active, focus, visited)
* Try styling for different user types (verified badges, admin colors)
* Experiment with CSS animations for like buttons
* Practice responsive design for mobile social media

## CSS Resources

* **MDN CSS Selectors**: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors
* **CSS Specificity Calculator**: https://specificity.keegan.st/
* **Social Media Design Patterns**: Study real apps like Facebook, Twitter, Instagram
* **CSS Zen Garden**: https://csszengarden.com/

Happy styling your social media app! 📱✨