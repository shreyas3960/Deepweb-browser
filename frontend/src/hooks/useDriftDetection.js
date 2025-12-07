import { useState, useEffect, useRef } from 'react';

export const useDriftDetection = (currentSession, pageContent) => {
  const [isDrifting, setIsDrifting] = useState(false);
  const [missingKeywords, setMissingKeywords] = useState([]);
  const checksRef = useRef([]);

  const calculateSimilarity = (content, session) => {
    if (!content || !session?.topic) return 1.0;

    const { topic, local_matching_rules } = session;
    const keywords = topic.keywords || [];
    const phrases = topic.phrases || [];
    const rules = local_matching_rules || {};

    const maxChars = session.recommendations?.maxPageTextCharsToEmbed || 2000;
    const text = content.substring(0, maxChars).toLowerCase();
    const title = session.topic.title?.toLowerCase() || '';

    // Tokenize
    const tokens = text.replace(/[^\w\s]/g, ' ').split(/\s+/);
    const tokenSet = new Set(tokens);

    // Calculate keyword score
    let totalWeight = 0;
    let matchedWeight = 0;
    const missing = [];

    keywords.forEach(kw => {
      const weight = kw.weight || 0.5;
      totalWeight += weight;
      const kwText = kw.kw.toLowerCase();
      const found = tokenSet.has(kwText) || text.includes(kwText);
      if (found) {
        matchedWeight += weight;
      } else {
        missing.push(kwText);
      }
    });

    // Phrase matching
    phrases.forEach(phrase => {
      const found = text.includes(phrase.toLowerCase());
      if (found) matchedWeight += 0.3;
      else missing.push(phrase);
      totalWeight += 0.3;
    });

    // Normalize
    let score = totalWeight > 0 ? matchedWeight / totalWeight : 0;

    // Title boost
    const titleBoost = rules.titleBoost || 1.3;
    const titleMatches = keywords.some(kw => title.includes(kw.kw.toLowerCase()));
    if (titleMatches) {
      score *= titleBoost;
    }

    // Short page fallback (Jaccard)
    if (text.length < 500 && keywords.length > 0) {
      const keywordSet = new Set(keywords.map(k => k.kw.toLowerCase()));
      const intersection = [...keywordSet].filter(k => tokenSet.has(k));
      const jaccard = intersection.length / keywordSet.size;
      score = Math.max(score, jaccard);
    }

    setMissingKeywords(missing.slice(0, 3));
    return Math.min(score, 1.0);
  };

  useEffect(() => {
    if (!currentSession || !pageContent) {
      setIsDrifting(false);
      return;
    }

    const score = calculateSimilarity(pageContent, currentSession);
    const threshold = currentSession.local_matching_rules?.minWeightedScore || 0.6;
    const isLowScore = score < threshold;

    const now = Date.now();
    checksRef.current.push({ score, isLow: isLowScore, timestamp: now });

    // Keep only last 30 seconds
    checksRef.current = checksRef.current.filter(c => now - c.timestamp < 30000);

    // Check drift: 3 low scores in last 30 seconds
    const lowCount = checksRef.current.filter(c => c.isLow).length;
    if (lowCount >= 3) {
      setIsDrifting(true);
    } else {
      setIsDrifting(false);
    }
  }, [pageContent, currentSession]);

  const resetDrift = () => {
    setIsDrifting(false);
    checksRef.current = [];
  };

  return { isDrifting, missingKeywords, resetDrift };
};