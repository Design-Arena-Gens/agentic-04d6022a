"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type Sender = "user" | "agent";

type Message = {
  id: string;
  sender: Sender;
  text: string;
  timestamp: number;
  tags?: string[];
};

type AgentContext = {
  goals: string[];
  channels: string[];
  brandTraits: string[];
  painPoints: string[];
  budget?: string;
  timeline?: string;
  contact?: string;
};

const INITIAL_CONTEXT: AgentContext = {
  goals: [],
  channels: [],
  brandTraits: [],
  painPoints: [],
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const keywordGroups = {
  pricing: ["price", "cost", "budget"],
  services: ["service", "offer", "capabilities", "what can you do", "expertise"],
  timeline: ["timeline", "when", "launch", "deadline", "kickoff", "start"],
  performance: ["roi", "results", "case study", "growth", "examples", "proof"],
  thanks: ["thanks", "thank you", "appreciate"],
  greeting: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
  nextSteps: ["next steps", "what next", "how do we start", "how do i start"],
};

const channelMatchers = [
  { label: "Paid Search", keywords: ["paid search", "ppc", "sem", "google ads", "search ads", "adwords"] },
  { label: "Paid Social", keywords: ["facebook ads", "instagram ads", "paid social", "tiktok ads", "linkedin ads"] },
  { label: "Organic Social", keywords: ["organic social", "instagram", "tiktok content", "social content", "community"] },
  { label: "Content & SEO", keywords: ["seo", "search", "blog", "content marketing", "organic traffic"] },
  { label: "Email & CRM", keywords: ["email", "crm", "nurture", "flows", "automation"] },
  { label: "Creative Strategy", keywords: ["creative", "video", "design", "brand storytelling", "asset"] },
];

const goalMatchers = [
  { label: "Lead Generation", keywords: ["leads", "lead gen", "pipeline", "booking", "demo"] },
  { label: "E-commerce Revenue", keywords: ["sales", "roas", "conversion", "checkout", "cart"] },
  { label: "Brand Awareness", keywords: ["awareness", "visibility", "reach", "top of funnel"] },
  { label: "Product Launch", keywords: ["launch", "new product", "go to market", "gtm"] },
  { label: "Retention & Loyalty", keywords: ["retention", "lifetime value", "loyalty", "repeat"] },
];

const painPointMatchers = [
  { label: "Underperforming Ads", keywords: ["low roi", "underperforming", "ads not working", "inefficient", "poor performance"] },
  { label: "Limited Resources", keywords: ["small team", "no time", "limited resources", "need support", "wearing many hats"] },
  { label: "Scaling Plateau", keywords: ["plateau", "stagnant", "flat growth", "need scale", "need to scale"] },
  { label: "Messaging Clarity", keywords: ["positioning", "messaging", "story", "brand voice", "branding issue"] },
];

const personalityMatchers = [
  { label: "Bold & Energetic", keywords: ["bold", "energetic", "edgy", "fun", "playful"] },
  { label: "Premium & Sophisticated", keywords: ["premium", "luxury", "high-end", "sophisticated"] },
  { label: "Trusted & Expert", keywords: ["trusted", "expert", "authoritative", "credible"] },
  { label: "Community-Driven", keywords: ["community", "authentic", "inclusive", "human"] },
];

const createMessage = (sender: Sender, text: string, tags?: string[]): Message => ({
  id: `${sender}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
  sender,
  text,
  timestamp: Date.now(),
  tags,
});

const createInitialConversation = (): Message[] => {
  const greeting = createMessage(
    "agent",
    "Hey, I’m PulsePilot, your always-on growth strategist. I help scope high-impact campaigns for agencies in real time."
  );
  const followUp = createMessage(
    "agent",
    "Tell me about the campaign you want to launch — goals, timeline, target audience, anything that keeps you up at night — and I’ll map out how we’d tackle it.",
    ["starter"]
  );

  return [greeting, followUp];
};

const mergeUnique = (current: string[], additions: string[]): string[] => {
  const unique = new Set(current);
  additions.forEach((item) => unique.add(item));
  return Array.from(unique);
};

const extractContextFromMessage = (message: string, context: AgentContext): AgentContext => {
  const lower = message.toLowerCase();
  let updated = { ...context };

  const channels = channelMatchers
    .filter((matcher) => matcher.keywords.some((keyword) => lower.includes(keyword)))
    .map((matcher) => matcher.label);
  if (channels.length) {
    updated.channels = mergeUnique(updated.channels, channels);
  }

  const goals = goalMatchers
    .filter((matcher) => matcher.keywords.some((keyword) => lower.includes(keyword)))
    .map((matcher) => matcher.label);
  if (goals.length) {
    updated.goals = mergeUnique(updated.goals, goals);
  }

  const pains = painPointMatchers
    .filter((matcher) => matcher.keywords.some((keyword) => lower.includes(keyword)))
    .map((matcher) => matcher.label);
  if (pains.length) {
    updated.painPoints = mergeUnique(updated.painPoints, pains);
  }

  const traits = personalityMatchers
    .filter((matcher) => matcher.keywords.some((keyword) => lower.includes(keyword)))
    .map((matcher) => matcher.label);
  if (traits.length) {
    updated.brandTraits = mergeUnique(updated.brandTraits, traits);
  }

  const budgetMatch = message.match(/\$?\s?(\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\s?(k|k\+|k\b|k\/mo|k per month|per month|monthly|usd|dollars)?)?/i);
  if (budgetMatch) {
    const rawValue = budgetMatch[0].replace(/\s+/g, " ").trim();
    updated.budget = rawValue;
  }

  const timelineMatch =
    message.match(/next\s+\d+\s+(?:weeks?|months?)/i) ??
    message.match(/q[1-4]\s?20\d{2}/i) ??
    message.match(/(?:this|next)\s+(?:month|quarter|season)/i);
  if (timelineMatch) {
    updated.timeline = timelineMatch[0].replace(/\s+/g, " ").trim();
  }

  const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    updated.contact = emailMatch[0];
  }

  return updated;
};

const containsKeyword = (message: string, keywords: string[]): boolean =>
  keywords.some((keyword) => message.includes(keyword));

const composeMomentumSummary = (context: AgentContext) => {
  const segments: string[] = [];

  if (context.goals.length) {
    segments.push(`📈 Goals locked: ${context.goals.join(", ")}`);
  }
  if (context.channels.length) {
    segments.push(`📡 Channels in play: ${context.channels.join(", ")}`);
  }
  if (context.painPoints.length) {
    segments.push(`🚧 Friction points: ${context.painPoints.join(", ")}`);
  }
  if (context.budget) {
    segments.push(`💰 Budget signal: ${context.budget}`);
  }
  if (context.timeline) {
    segments.push(`⏱ Timeline flag: ${context.timeline}`);
  }
  if (context.contact) {
    segments.push(`🤝 Handoff ready at ${context.contact}`);
  }

  return segments;
};

const buildCampaignBlueprint = (context: AgentContext): string => {
  const lines: string[] = [];

  if (context.goals.length || context.channels.length) {
    lines.push("Here’s how I’d architect the campaign to hit your targets:");
  } else {
    lines.push("I’ll map a QuickStrike blueprint so you can see the moving pieces:");
  }

  const goalLine =
    context.goals.length > 0
      ? `• Mission control: ${context.goals.join(", ")}`
      : "• Mission control: plug revenue leaks and create compounding growth";
  lines.push(goalLine);

  const channelLine =
    context.channels.length > 0
      ? `• Channel mix: ${context.channels.join(", ")} with creative built for platform-native performance`
      : "• Channel mix: Paid social + lifecycle nurture + an always-on creative lab to feed performance";
  lines.push(channelLine);

  const painLine =
    context.painPoints.length > 0
      ? `• Friction fix: ${context.painPoints.join(", ")}`
      : "• Friction fix: tighten attribution, accelerate testing velocity, and build a revenue narrative leadership can stand behind";
  lines.push(painLine);

  lines.push(
    context.timeline
      ? `• Speed to launch: kick-off deck in <48h, roadmap locked for ${context.timeline}`
      : "• Speed to launch: kick-off deck in <48h, MVP experiments in market within 10 days"
  );

  lines.push(
    context.budget
      ? `• Budget choreography: align ${context.budget} into test/control pods so we can spotlight win rates fast`
      : "• Budget choreography: modular test pods so every dollar reports back what worked, what didn’t, and why"
  );

  return lines.join("\n");
};

const generateAgentReply = (
  latestMessage: string,
  history: Message[],
  context: AgentContext
): { reply: string; updatedContext: AgentContext; tags: string[] } => {
  const enrichedContext = extractContextFromMessage(latestMessage, context);
  const lower = latestMessage.toLowerCase();
  const tags: string[] = [];

  const responseSegments: string[] = [];

  const isInitialExchange = history.filter((msg) => msg.sender === "user").length <= 1;
  if (containsKeyword(lower, keywordGroups.thanks)) {
    tags.push("rapport");
    const summary = composeMomentumSummary(enrichedContext);
    responseSegments.push("Any time — I’ll keep refining this playbook as you feed me new signals.");
    if (summary.length) {
      responseSegments.push(`Before we wrap, here’s the current snapshot:\n${summary.join("\n")}`);
    }
    responseSegments.push(
      enrichedContext.contact
        ? `I can queue an intro to your account lead. Want me to send a calendar block to ${enrichedContext.contact}?`
        : "If you’re ready for handoff, drop the best email and I’ll spin up an intro thread with the growth team."
    );
    return {
      reply: responseSegments.join("\n\n"),
      updatedContext: enrichedContext,
      tags,
    };
  }

  if (containsKeyword(lower, keywordGroups.pricing)) {
    tags.push("budget");
    responseSegments.push(
      "We scope growth sprints against outcomes, not arbitrary retainers. Typical pods land between $7.5K–$18K/mo depending on how many specialists we deploy."
    );
    responseSegments.push(
      enrichedContext.budget
        ? `With a budget signal around ${enrichedContext.budget}, we’d spin up a modular squad focused on the fastest revenue unlocks.`
        : "If you share the monthly range you’re comfortable with, I’ll forecast the squad make-up and time to break-even."
    );
    responseSegments.push("Want me to outline how that would break down across strategy, production, and optimization?");
    return {
      reply: responseSegments.join("\n\n"),
      updatedContext: enrichedContext,
      tags,
    };
  }

  if (containsKeyword(lower, keywordGroups.services)) {
    tags.push("services");
    responseSegments.push(
      "We operate as an embedded growth pod; think strategists, channel experts, and creative engineers working off the same dashboard."
    );
    responseSegments.push(
      "Core stack includes: lifecycle growth strategy, brand narrative crafting, full-funnel paid + organic campaigns, conversion design, and analytics/attribution."
    );
    responseSegments.push(
      enrichedContext.channels.length
        ? `I’m already flagging ${enrichedContext.channels.join(", ")} as primary levers for you — want a deeper breakdown by channel?`
        : "Tell me the channels you care about most and I’ll tailor the pod around them."
    );
    return { reply: responseSegments.join("\n\n"), updatedContext: enrichedContext, tags };
  }

  if (containsKeyword(lower, keywordGroups.timeline)) {
    tags.push("timeline");
    responseSegments.push(
      "Launch velocity is baked in. Discovery sync day 1, playbook draft inside 48h, experiments in market within the first 10 days."
    );
    responseSegments.push(
      enrichedContext.timeline
        ? `With ${enrichedContext.timeline} as the target window, we’d prioritize rapid creative sprints and a single source-of-truth dashboard for daily decisions.`
        : "Drop the exact timing you’re working toward and I’ll build the activation calendar backward from that milestone."
    );
    responseSegments.push("Want me to surface the first three experiments we’d stand up?");
    return { reply: responseSegments.join("\n\n"), updatedContext: enrichedContext, tags };
  }

  if (containsKeyword(lower, keywordGroups.performance)) {
    tags.push("proof");
    responseSegments.push(
      "Recent wins: +213% qualified pipeline for a B2B SaaS in 90 days, 4.2x MER for a DTC wellness brand, 38% lift in LTV after rebuilding lifecycle journeys."
    );
    responseSegments.push(
      "We benchmark success on three pillars — acquisition efficiency, conversion velocity, and retention economics — and report in a board-ready format."
    );
    responseSegments.push("Tell me the KPI your leadership obsesses over and I’ll share the exact reporting cadence we’d deploy.");
    return { reply: responseSegments.join("\n\n"), updatedContext: enrichedContext, tags };
  }

  if (containsKeyword(lower, keywordGroups.nextSteps)) {
    tags.push("handoff");
    responseSegments.push("Next step is a 25-minute Alignment Lab where we validate goals, stack-rank experiments, and lock resourcing.");
    responseSegments.push(
      enrichedContext.contact
        ? `I can send an invite directly to ${enrichedContext.contact}. Does early next week work, or should I tee up alternative slots?`
        : "Drop the best email and preferred day/time windows, and I’ll slot it instantly."
    );
    responseSegments.push("Ahead of that I’ll package this chat into a shorthand brief so the human team walks in already calibrated.");
    return { reply: responseSegments.join("\n\n"), updatedContext: enrichedContext, tags };
  }

  if (containsKeyword(lower, keywordGroups.greeting) && isInitialExchange) {
    tags.push("rapport");
    responseSegments.push("Great to connect. Consider me your on-call strategist — I’ll keep iterating as you feed me more intel.");
    responseSegments.push("What’s the biggest growth unlock you’re chasing right now?");
    return { reply: responseSegments.join("\n\n"), updatedContext: enrichedContext, tags };
  }

  const blueprint = buildCampaignBlueprint(enrichedContext);
  const summary = composeMomentumSummary(enrichedContext);
  responseSegments.push(blueprint);

  if (!enrichedContext.budget) {
    responseSegments.push("Give me a budget guardrail and I’ll orchestrate which levers we lean on first.");
  }

  if (!enrichedContext.contact) {
    responseSegments.push("Ready when you are to loop in a human. Drop an email and I’ll prep the team with a tidy brief.");
  }

  if (summary.length) {
    tags.push("insight");
    responseSegments.push(`Signal tracker updated:\n${summary.join("\n")}`);
  }

  return {
    reply: responseSegments.join("\n\n"),
    updatedContext: enrichedContext,
    tags,
  };
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(() => createInitialConversation());
  const [context, setContext] = useState<AgentContext>(INITIAL_CONTEXT);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  const insights = useMemo(() => composeMomentumSummary(context), [context]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage = createMessage("user", trimmed);
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");

    const { reply, updatedContext, tags } = generateAgentReply(trimmed, nextHistory, context);
    setIsTyping(true);

    const delay = Math.min(1600, Math.max(640, trimmed.length * 18));
    window.setTimeout(() => {
      setMessages((prev) => [...prev, createMessage("agent", reply, tags)]);
      setContext(updatedContext);
      setIsTyping(false);
      queueMicrotask(() => {
        if (streamRef.current) {
          streamRef.current.scrollTop = streamRef.current.scrollHeight;
        }
      });
    }, delay);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSend();
  };

  const autoScroll = () => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    autoScroll();
  }, [messages, isTyping]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.badge}>Agentic Marketing Pod</span>
          <h1 className={styles.headline}>
            Deploy an autonomous strategist that qualifies leads and spins up campaign blueprints in minutes.
          </h1>
          <p className={styles.dek}>
            PulsePilot listens like an account director, thinks like a growth lead, and packages buyer intent into a
            ready-to-run scope your human team can action instantly.
          </p>
          <div className={styles.pills}>
            {["AI-powered briefing", "Campaign orchestration", "Lead qualification", "Realtime insights"].map((item) => (
              <span key={item} className={styles.pill}>
                <span className={styles.pillDot} />
                {item}
              </span>
            ))}
          </div>
          <div className={styles.split}>
            <article className={styles.statCard}>
              <span className={styles.statValue}>12m</span>
              <span className={styles.statLabel}>Average time to deploy first experiment</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>9.4/10</span>
              <span className={styles.statLabel}>Client satisfaction after AI-led discovery</span>
            </article>
          </div>
          <div className={styles.ctaGroup}>
            <button type="button" className={styles.ctaPrimary} onClick={() => streamRef.current?.scrollIntoView({ behavior: "smooth" })}>
              See the agent in action
            </button>
            <button
              type="button"
              className={styles.ctaGhost}
              onClick={() => window.open("mailto:launch@pulsepilot.agency?subject=Activate%20PulsePilot")}
            >
              Request human handoff
            </button>
          </div>
        </section>
        <section className={styles.chatCard}>
          <header className={styles.chatHeader}>
            <h2 className={styles.agentTitle}>PulsePilot Conversation Hub</h2>
            <p className={styles.agentSub}>
              Marketing AI that scopes campaigns, highlights priorities, and preps your delivery team before the first call.
            </p>
          </header>
          <div ref={streamRef} className={styles.chatStream}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.message} ${message.sender === "agent" ? styles.agent : styles.user}`}
              >
                <span className={styles.messageMeta}>
                  {message.sender === "agent" ? "PulsePilot" : "You"} · {timeFormatter.format(message.timestamp)}
                  {message.tags?.map((tag) => (
                    <span key={`${message.id}-${tag}`} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </span>
                <span>{message.text}</span>
              </article>
            ))}
            {isTyping && (
              <div className={`${styles.message} ${styles.agent}`}>
                <span className={styles.messageMeta}>PulsePilot · now</span>
                <span className={styles.typing}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </span>
              </div>
            )}
          </div>
          <form className={styles.composer} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              placeholder="Drop a campaign goal, challenge, or timeline and I’ll architect the plan…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="off"
            />
            <button className={styles.sendButton} type="submit" disabled={!input.trim() || isTyping}>
              Deploy Insight
            </button>
          </form>
          <footer className={styles.insights}>
            <div className={styles.insightHeader}>
              <span>Live Insight Stack</span>
              <span className={styles.highlight}>{insights.length} signals tracked</span>
            </div>
            <div className={styles.insightList}>
              {insights.length ? (
                insights.map((insight, index) => (
                  <span key={index} className={styles.insightItem}>
                    {insight}
                  </span>
                ))
              ) : (
                <span className={styles.emptyState}>
                  I’ll surface campaign-ready signals here as soon as you feed me goals, budgets, or obstacles.
                </span>
              )}
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
