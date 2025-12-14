const FALLBACK_PREFIX = {
  en: '[EN]',
  de: '[DE]',
};

export async function translateText(text, target = 'en') {
  if (!text) return '';
  const payload = {
    q: text,
    source: 'es',
    target,
    format: 'text',
  };

  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('translation failed');
    const data = await response.json();
    return data?.translatedText || `${FALLBACK_PREFIX[target] || ''} ${text}`;
  } catch (error) {
    // Fallback for offline/demo mode.
    return `${FALLBACK_PREFIX[target] || ''} ${text}`;
  }
}

export async function translateDish(title, description) {
  const [enTitle, enDescription, deTitle, deDescription] = await Promise.all([
    translateText(title, 'en'),
    translateText(description, 'en'),
    translateText(title, 'de'),
    translateText(description, 'de'),
  ]);

  return {
    en: { title: enTitle, description: enDescription },
    de: { title: deTitle, description: deDescription },
  };
}
