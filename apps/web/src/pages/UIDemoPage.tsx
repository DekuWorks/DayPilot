import { Button, Input, Label, Card, Badge } from '@daypilot/ui';

export function UIDemoPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <h1 className="text-4xl font-bold mb-8">UI Components Demo</h1>

      <Card>
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold mb-4">Inputs</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="demo-input">Email</Label>
            <Input
              id="demo-input"
              type="email"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <Label htmlFor="demo-password">Password</Label>
            <Input
              id="demo-password"
              type="password"
              placeholder="Enter your password"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold mb-4">Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold mb-4">Cards</h2>
        <p className="text-gray-600">
          This is a card component. It provides a clean container for content.
        </p>
      </Card>
    </div>
  );
}
