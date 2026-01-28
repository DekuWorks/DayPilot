-- Verify and create organizations table if missing
-- This migration ensures the organizations table exists with proper structure

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'team', 'business', 'enterprise')),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table if it doesn't exist (required for RLS policies)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create indexes for organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);

-- Ensure RLS is enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Owners can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners and admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON public.organizations;

-- Create RLS policies
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- Drop existing policies for organization_members if they exist
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.organization_members;

-- Create RLS policies for organization_members
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage members"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();
