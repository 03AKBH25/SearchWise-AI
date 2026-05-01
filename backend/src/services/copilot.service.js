const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

function firstRecommendation(context) {
  return context?.recommendations?.[0] || null;
}

function recommendedFund(context) {
  return context?.discovery?.candidates?.[0] || null;
}

export async function getCopilotResponse(userMessage = '', context = {}) {
  const text = userMessage.toLowerCase();
  const rec = firstRecommendation(context);
  const candidate = recommendedFund(context);

  if (!rec && !candidate) {
    return 'Start by adding your goal, horizon and either an existing holding or SIP amount. I will then compare your current fund, find suitable Direct-plan candidates, and explain what to do first.';
  }

  if (text.includes('why') || text.includes('explain')) {
    return [
      `The main reason is cost drag. For ${rec?.fund.displayName || candidate.displayName}, the Direct plan has a lower annual expense ratio than the Regular plan.`,
      rec
        ? `In your scenario, the modeled long-term difference is ${currency.format(rec.score.savings)} before exit load and tax. Because both variants are the same scheme, exposure risk should stay broadly unchanged.`
        : `${candidate.displayName} has a ${candidate.fitScore}/100 fit score for your selected goal and risk comfort.`,
      'The decision is still uncertain around tax, exit load and whether you receive valuable advice from the Regular distributor.'
    ].join('\n\n');
  }

  if (text.includes('new') || text.includes('suggest') || text.includes('recommend')) {
    const funds = context?.discovery?.candidates || [];
    return funds
      .slice(0, 3)
      .map((fund, index) => `${index + 1}. ${fund.displayName}: ${fund.fitScore}/100 fit. ${fund.why.join('; ')}.`)
      .join('\n\n');
  }

  if (text.includes('tax') || text.includes('exit')) {
    return [
      'Before switching existing units, check three things: exit load window, short-term or long-term capital gains tax, and whether you can switch only future SIPs first.',
      rec
        ? `For the selected fund, the listed exit-load rule is: ${rec.variants.current.exitLoad}. If your units are still inside that window, waiting may be better.`
        : 'If you share the holding date and fund, the next version could calculate this more precisely.'
    ].join('\n\n');
  }

  if (text.includes('risk')) {
    return [
      rec
        ? `${rec.fund.displayName} is marked ${rec.fund.riskLabel}. Switching Regular to Direct does not meaningfully change portfolio exposure because it is the same underlying scheme.`
        : `${candidate.displayName} is marked ${candidate.riskLabel}.`,
      'The real risk decision is whether this category fits your horizon and drawdown comfort, not whether the plan is Direct or Regular.'
    ].join('\n\n');
  }

  return [
    context?.summary?.nextAction?.label || 'Use Direct plans for new investments when you do not need distributor-led advice.',
    context?.summary?.nextAction?.reason || 'The co-pilot prioritizes lower cost, goal fit, risk alignment and tax/exit-load uncertainty.',
    'Ask me “why this fund?”, “suggest new funds”, “what about tax?”, or “what is the risk?” for a focused explanation.'
  ].join('\n\n');
}
