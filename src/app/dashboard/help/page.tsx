"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  Twitter,
  LayoutList,
  HelpCircle,
  Users,
  Sparkles,
  ListChecks,
  Link as LinkIcon,
  Database,
  Shield,
  RefreshCw,
  UserPlus,
  Key,
} from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  return (
    <Suspense>
      <HelpContent />
    </Suspense>
  );
}

// ─── Setup Checklist Status ──────────────────────────────────────────────────

interface ChecklistState {
  loading: boolean;
  anthropicKey: boolean;
  xConnected: boolean;
  xSynced: boolean;
}

function useSetupChecklist(): ChecklistState {
  const [state, setState] = useState<ChecklistState>({
    loading: true,
    anthropicKey: false,
    xConnected: false,
    xSynced: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/settings")
        .then((r) => r.json())
        .catch(() => ({ source: "none" })),
      fetch("/api/platforms/x")
        .then((r) => r.json())
        .catch(() => ({ connected: false })),
    ]).then(([settings, xStatus]) => {
      setState({
        loading: false,
        anthropicKey: settings.source !== "none",
        xConnected: xStatus.connected === true,
        xSynced: xStatus.account?.lastSyncedAt != null,
      });
    });
  }, []);

  return state;
}

// ─── Reusable Components ─────────────────────────────────────────────────────

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">
      {children}
    </pre>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

function ChecklistItem({
  label,
  done,
  loading,
  href,
}: {
  label: string;
  done: boolean;
  loading: boolean;
  href: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : done ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground" />
      )}
      <span className={done ? "text-muted-foreground line-through" : ""}>
        {label}
      </span>
      {!done && !loading && (
        <Link
          href={href}
          className="ml-auto text-xs text-primary underline underline-offset-2"
        >
          Configure
        </Link>
      )}
    </div>
  );
}

// ─── Tab Content ─────────────────────────────────────────────────────────────

function GettingStartedTab() {
  const checklist = useSetupChecklist();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Welcome to OpenVolo
          </CardTitle>
          <CardDescription>
            AI-Native Social CRM for X/Twitter + LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            OpenVolo helps you manage contacts from social platforms, track
            engagement, and leverage AI-powered agents for outreach. Everything
            runs locally on your machine with SQLite — your data never leaves
            your computer.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Import and manage contacts from X/Twitter</span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Track enrichment scores across platforms</span>
            </div>
            <div className="flex items-start gap-2">
              <ListChecks className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Create tasks and track engagement workflows</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Quick Setup Checklist
          </CardTitle>
          <CardDescription>
            Complete these steps to get the most out of OpenVolo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChecklistItem
            label="Anthropic API Key configured"
            done={checklist.anthropicKey}
            loading={checklist.loading}
            href="/dashboard/settings"
          />
          <ChecklistItem
            label="X/Twitter account connected"
            done={checklist.xConnected}
            loading={checklist.loading}
            href="/dashboard/settings"
          />
          <ChecklistItem
            label="First contact sync completed"
            done={checklist.xSynced}
            loading={checklist.loading}
            href="/dashboard/settings"
          />
        </CardContent>
      </Card>

      {/* Environment Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Environment Setup
          </CardTitle>
          <CardDescription>
            Configure environment variables for API access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Copy <Code>.env.example</Code> to <Code>.env.local</Code> and fill
            in your credentials:
          </p>
          <CodeBlock>{`ANTHROPIC_API_KEY="sk-ant-..."
X_CLIENT_ID="your-oauth2-client-id"
X_CLIENT_SECRET="your-oauth2-client-secret"`}</CodeBlock>
          <p className="text-xs text-muted-foreground">
            The Anthropic key can also be set via the{" "}
            <Link
              href="/dashboard/settings"
              className="text-primary underline underline-offset-2"
            >
              Settings
            </Link>{" "}
            page. X credentials must be set as environment variables.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function XSetupTab() {
  return (
    <div className="space-y-6">
      {/* Prerequisites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Prerequisites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              An X Developer account at{" "}
              <span className="text-primary font-medium">developer.x.com</span>
            </li>
            <li>A project and app created in the X Developer Portal</li>
            <li>Free tier: account connection + posting (500 posts/month)</li>
            <li>Basic tier ($200/mo): also enables contact sync (importing following list)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Step 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={1} />
            Create X Developer App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Go to{" "}
              <span className="text-primary font-medium">developer.x.com</span>{" "}
              and sign in
            </li>
            <li>Navigate to the Dashboard and create a new Project/App</li>
            <li>
              Note the API Key and API Secret shown on the{" "}
              <strong className="text-foreground">Keys and tokens</strong> tab
              (these are OAuth 1.0a credentials — for reference only)
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={2} />
            Configure User Authentication
          </CardTitle>
          <CardDescription>
            This generates the OAuth 2.0 credentials that OpenVolo uses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              In your app, go to{" "}
              <strong className="text-foreground">Settings</strong> &rarr;{" "}
              <strong className="text-foreground">
                User authentication settings
              </strong>{" "}
              &rarr;{" "}
              <strong className="text-foreground">Set up</strong>
            </li>
            <li>
              <strong className="text-foreground">App permissions</strong>:
              Select <Code>Read and write</Code>
            </li>
            <li>
              <strong className="text-foreground">Type of App</strong>: Select{" "}
              <Code>Web App, Automated App or Bot</Code> (Confidential client)
            </li>
            <li>
              <strong className="text-foreground">
                Callback URI / Redirect URL
              </strong>
              :
              <CodeBlock>http://localhost:3000/api/platforms/x/callback</CodeBlock>
            </li>
            <li>
              <strong className="text-foreground">Website URL</strong>: Your
              domain (e.g., <Code>https://yourdomain.com</Code>)
            </li>
            <li>
              Click <strong className="text-foreground">Save</strong> — X
              generates a new{" "}
              <strong className="text-foreground">OAuth 2.0 Client ID</strong>{" "}
              and{" "}
              <strong className="text-foreground">Client Secret</strong>
            </li>
          </ol>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Save these immediately — the Client Secret is shown only once.
          </div>
        </CardContent>
      </Card>

      {/* Step 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={3} />
            Configure OpenVolo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Add the OAuth 2.0 credentials to your <Code>.env.local</Code>:
          </p>
          <CodeBlock>{`X_CLIENT_ID="your-oauth2-client-id"
X_CLIENT_SECRET="your-oauth2-client-secret"`}</CodeBlock>
          <p>
            Restart the dev server (<Code>npm run dev</Code>) to pick up the new
            variables.
          </p>
          <div className="rounded-lg border bg-muted/50 p-3 text-xs">
            <strong className="text-foreground">Note:</strong> The OAuth 2.0
            Client ID/Secret (from User Authentication setup) are different from
            the API Key/Secret shown on the Keys tab. OpenVolo uses OAuth 2.0.
          </div>
        </CardContent>
      </Card>

      {/* Step 4 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={4} />
            Connect & Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Go to{" "}
              <Link
                href="/dashboard/settings"
                className="text-primary underline underline-offset-2"
              >
                Settings
              </Link>{" "}
              &rarr; Platform Connections &rarr; Click{" "}
              <strong className="text-foreground">Connect</strong> on X/Twitter
            </li>
            <li>Authorize the app on X (works on all tiers, including Free)</li>
            <li>
              <strong className="text-foreground">Free tier</strong>: You&apos;re
              connected and can post. To import contacts, click{" "}
              <strong className="text-foreground">Enable Contact Sync</strong>{" "}
              (requires Basic tier)
            </li>
            <li>
              <strong className="text-foreground">Basic tier</strong>: Click{" "}
              <strong className="text-foreground">Enable Contact Sync</strong>{" "}
              &rarr; re-authorize with extended permissions &rarr; then click{" "}
              <strong className="text-foreground">Sync Now</strong>
            </li>
            <li>
              Contacts appear in{" "}
              <Link
                href="/dashboard/contacts"
                className="text-primary underline underline-offset-2"
              >
                Contacts
              </Link>{" "}
              with X identity badges and enrichment scores
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function FeaturesTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>Create, edit, and delete contacts</li>
            <li>Search across name and email fields</li>
            <li>Filter by funnel stage and platform</li>
            <li>Each contact tracks an enrichment score (0 &ndash; 100)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Contact Identities & Enrichment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Contacts can have multiple platform identities (X, LinkedIn, etc.)
            </li>
            <li>
              Enrichment score computed from profile completeness: name, email,
              phone, bio, location, photo, and platform data
            </li>
            <li>
              Scores update automatically on every contact or identity change
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            X/Twitter Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Imports your &ldquo;following&rdquo; list as CRM contacts
            </li>
            <li>
              Deduplicates by platform user ID — re-syncing updates existing
              contacts
            </li>
            <li>
              Pulls: name, bio, location, profile photo, follower/following
              counts
            </li>
            <li>Rate limiting tracked from X API response headers</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>Create manual tasks linked to contacts</li>
            <li>
              Track status: todo &rarr; in_progress &rarr; blocked &rarr; done
            </li>
            <li>Priority levels: low, medium, high, urgent</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function FaqTab() {
  const faqs = [
    {
      icon: Database,
      q: "Where is my data stored?",
      a: (
        <>
          SQLite at <Code>~/.openvolo/data.db</Code>. All data stays on your
          machine — nothing is sent to external servers.
        </>
      ),
    },
    {
      icon: Shield,
      q: "How are credentials secured?",
      a: (
        <>
          AES-256-GCM encryption tied to your machine identity. Stored in{" "}
          <Code>~/.openvolo/config.json</Code>.
        </>
      ),
    },
    {
      icon: Twitter,
      q: "What X API plan do I need?",
      a: "Free tier supports account connection and posting (500 posts/month). To import your following list via Contact Sync, you need the Basic tier ($200/mo) which includes follows.read access.",
    },
    {
      icon: Key,
      q: "Why do I need two sets of X credentials?",
      a: (
        <>
          The API Key/Secret (Keys tab) are OAuth 1.0a credentials. The Client
          ID/Secret (from User Authentication setup) are OAuth 2.0 credentials.
          OpenVolo uses OAuth 2.0.
        </>
      ),
    },
    {
      icon: RefreshCw,
      q: "What happens when I click Sync?",
      a: "Fetches up to 1,000 accounts you follow, creates or updates contacts with X profile data, and computes enrichment scores. Requires the X API Basic tier ($200/mo) for follows.read access.",
    },
    {
      icon: RefreshCw,
      q: "Why can't I sync contacts?",
      a: "Contact sync uses the follows.read endpoint which X removed from the Free tier in August 2025. You need the X API Basic tier ($200/mo). After upgrading your X Developer plan, click \"Enable Contact Sync\" in Settings to re-authorize with the required permissions.",
    },
    {
      icon: UserPlus,
      q: "Can I connect multiple X accounts?",
      a: "Currently one account per platform. The schema supports multiple but the UI assumes single-user.",
    },
    {
      icon: Key,
      q: "How do I update my API keys?",
      a: (
        <>
          Edit <Code>.env.local</Code> and restart the dev server. For the
          Anthropic key, you can also update via the{" "}
          <Link
            href="/dashboard/settings"
            className="text-primary underline underline-offset-2"
          >
            Settings
          </Link>{" "}
          UI.
        </>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <Card key={i}>
          <CardContent className="flex gap-3 pt-6">
            <faq.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">{faq.q}</p>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Content ────────────────────────────────────────────────────────────

const VALID_TABS = ["getting-started", "x-setup", "features", "faq"] as const;
type TabValue = (typeof VALID_TABS)[number];

function HelpContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabValue =
    tabParam && VALID_TABS.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : "getting-started";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Help & Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Guides, setup instructions, and frequently asked questions.
        </p>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="getting-started">
            <Rocket className="h-4 w-4" />
            Getting Started
          </TabsTrigger>
          <TabsTrigger value="x-setup">
            <Twitter className="h-4 w-4" />
            X/Twitter Setup
          </TabsTrigger>
          <TabsTrigger value="features">
            <LayoutList className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="faq">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started">
          <GettingStartedTab />
        </TabsContent>
        <TabsContent value="x-setup">
          <XSetupTab />
        </TabsContent>
        <TabsContent value="features">
          <FeaturesTab />
        </TabsContent>
        <TabsContent value="faq">
          <FaqTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
