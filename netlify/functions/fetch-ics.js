// netlify/functions/fetch-ics.js

export const handler = async () => {
  const ICS_URL =
    'https://calendar.google.com/calendar/ical/e2cb3bffa47e974e82bfa40a1c33312f9dd0ed5f02ebdf1f3fe8ac3e13eb618a%40group.calendar.google.com/public/basic.ics';

  try {
    const res = await fetch(ICS_URL);

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: `ICS fetch failed: ${res.statusText}`,
      };
    }

    const text = await res.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `Server error: ${err.message}`,
    };
  }
};
