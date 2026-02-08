 i am having a hard time distiguishing between campaigns and workflows as concepts. why
  not merge into workflows of different types - lead generation campaigns, data pruning
  workflows, prospecting campaigns, etc. I also do not see the point of switching between
  agents tab and workflows tab. why not combine campaigns, agents, and workflows in to
  simply workflows? then visualize workflows as set of views which user can switch like
  kanban, swimlanes with cards by types of workflows, list view, visual graph? think about
  the refactoring required, debate and question me for clarity, update the specs or write
  a new one.

  I want you to think about moving features like linkedin CSV import, sync gmail metadata,
  and X browser enrichment to Workflows tab. Think about how these are single,
  multi-step, or periodic workflows to enrich, update contacts. Think about tracking
  progress or completion based on source data and openvolo data, for example - if gmail
  has 1000 contacts, track how many we sunced so far, and next sync should be incremental
  for next batch. Think like a workflow. Rethink Browser session as a mult-agent workflow
  for X, LinkedIn, and include Search and scraping of other authoritative sources of
  information about influential people or important business leaders like Wikipedia. Think
  about benefits of DOM parsing verses headless browsing. Think about tying this workflow
  of sourcing new leads to a campaign. There should be pre-defined campaign cards with
  system prompts for sourcing leads who are certain persona like top influencers in an
  industry or field. User can run a campaign to prospect new leads using either search ->
  url request -> scraping -> enrich workflow, or using headless browser agent. Think about
  pre-baking routing rules from campaigns to workflows vs runtime routing using an LLM.
  Write a new spec which should also point to existing specs where refinements are
  required to achieve this vision. In fact the OpenVolo agent should use direct url
  scraping or browser headless use as tools and decide routhing to these tools at runtime.
  Workflows tab should inform user when these decisions are being taken. Also think about
  pruning campaigns where OpenVolo user may have hundreds of legacy contacts or contacts
  they do not want to campaign (like own company) and they should be able to run a
  campaign -> activating a workflow to prune current contacts based on a prompt the
  openvolo user adds to a campaign. Like prune contacts from company ABC. Such campaings
  and related workflows should be repeatable and archived for prior runs.
──────────────────────────────────────────────────────────────────────────