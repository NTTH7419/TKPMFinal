## ADDED Requirements

### Requirement: Shared UI package exists
The system SHALL provide a `packages/ui` package containing reusable UI components using CSS Modules, consumable by all 3 apps via workspace dependency.

#### Scenario: Package is importable
- **WHEN** an app imports from `@tkpm/ui`
- **THEN** the component renders correctly with its scoped styles

### Requirement: Button component
The `packages/ui` package SHALL export a `Button` component supporting `variant` (`primary` | `secondary` | `danger`) and `size` (`sm` | `md` | `lg`) props.

#### Scenario: Primary button renders
- **WHEN** `<Button variant="primary">Label</Button>` is rendered
- **THEN** button displays with primary color styling and correct cursor

#### Scenario: Disabled state
- **WHEN** `<Button disabled>Label</Button>` is rendered
- **THEN** button appears visually disabled and does not trigger `onClick`

### Requirement: Input component
The `packages/ui` package SHALL export an `Input` component supporting `label`, `error`, `placeholder`, and all standard HTML input attributes.

#### Scenario: Input with error
- **WHEN** `<Input error="Required field" />` is rendered
- **THEN** input border turns red and error message appears below the field

#### Scenario: Input with label
- **WHEN** `<Input label="Email" />` is rendered
- **THEN** label text appears above the input field

### Requirement: Card component
The `packages/ui` package SHALL export a `Card` component as a styled container with optional `padding` and `shadow` props.

#### Scenario: Card renders children
- **WHEN** `<Card>content</Card>` is rendered
- **THEN** children appear inside a bordered, rounded container

### Requirement: Badge component
The `packages/ui` package SHALL export a `Badge` component supporting `variant` (`success` | `warning` | `error` | `info` | `neutral`) for status display.

#### Scenario: Success badge
- **WHEN** `<Badge variant="success">Active</Badge>` is rendered
- **THEN** badge displays with green background and appropriate text

### Requirement: Skeleton component
The `packages/ui` package SHALL export a `Skeleton` component with `width`, `height`, and `borderRadius` props showing an animated shimmer placeholder.

#### Scenario: Skeleton animates
- **WHEN** `<Skeleton width="100%" height="20px" />` is rendered
- **THEN** a shimmer animation plays continuously on the placeholder element
