// netlify/functions/fetch-ics.js

export const handler = async () => {
  const ICS_URL =
    'https://calendar.google.com/calendar/ical/0841982bf57ed3d9d6c39aacece5b0f25bc7bc5894b1c6750218d64a047c96f4%40group.calendar.google.com/public/basic.ics';

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
