import { NextResponse } from 'next/server';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ProcessedPreferences {
  areas?: string;
  minBeds?: string;
  maxBeds?: string;
  minBaths?: string;
  minPrice?: string;
  maxPrice?: string;
  noFee?: string;
  additionalPreferences: {
    mustHave: string[];
    modernPreference?: boolean;
    naturalLightPreference?: boolean;
    appliancePreference?: 'new' | 'any';
  };
}

// User-friendly neighborhood groups
const NEIGHBORHOOD_GROUPS: Record<string, string[]> = {
  'manhattan': ['roosevelt-island', 'financial-district', 'tribeca', 'soho', 'little-italy',
    'lower-east-side', 'chinatown', 'battery-park-city', 'gramercy-park',
    'chelsea', 'west-chelsea', 'greenwich-village', 'east-village', 'west-village',
    'flatiron', 'nomad', 'nolita', 'midtown', 'central-park-south', 'midtown-south',
    'midtown-east', 'murray-hill', 'kips-bay', 'midtown-west', 'hells-kitchen',
    'upper-west-side', 'lincoln-square', 'upper-east-side', 'lenox-hill', 'yorkville',
    'carnegie-hill', 'morningside-heights', 'hamilton-heights', 'washington-heights',
    'inwood', 'central-harlem', 'east-harlem', 'south-harlem'],
  'brooklyn': ['greenpoint', 'williamsburg', 'east-williamsburg', 'downtown-brooklyn',
    'fort-greene', 'brooklyn-heights', 'boerum-hill', 'dumbo', 'bedford-stuyvesant',
    'bushwick', 'red-hook', 'park-slope', 'gowanus', 'carroll-gardens', 'cobble-hill',
    'sunset-park', 'windsor-terrace', 'crown-heights', 'prospect-heights', 'clinton-hill'],
  'queens': ['astoria', 'long-island-city', 'sunnyside', 'woodside', 'jackson-heights',
    'forest-hills', 'flushing', 'ridgewood'],
  'bronx': ['mott-haven', 'riverdale', 'concourse', 'fordham', 'pelham-bay', 'morris-park',
    'woodlawn'],
  'staten-island': ['saint-george', 'tompkinsville', 'stapleton'],
  'downtown': ['financial-district', 'tribeca', 'soho', 'little-italy', 'lower-east-side', 
    'chinatown', 'battery-park-city', 'west-village', 'east-village', 'nolita'],
  'midtown': ['chelsea', 'gramercy-park', 'flatiron', 'nomad', 'midtown', 'midtown-south',
    'midtown-east', 'murray-hill', 'kips-bay', 'midtown-west', 'hells-kitchen'],
  'upper-manhattan': ['upper-west-side', 'upper-east-side', 'morningside-heights', 
    'hamilton-heights', 'washington-heights', 'inwood', 'central-harlem', 'east-harlem']
};

// Friendly names for conversation
const USER_FRIENDLY_AREAS = [
  'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island',
  'Downtown Manhattan', 'Midtown', 'Upper Manhattan',
  'East Village', 'West Village', 'Lower East Side', 'Upper East Side', 'Upper West Side',
  'Chelsea', 'Tribeca', 'SoHo', 'Financial District',
  'Williamsburg', 'Bushwick', 'Greenpoint', 'DUMBO', 'Park Slope',
  'Astoria', 'Long Island City', 'Forest Hills'
];

function expandAreaToStreetEasyCodes(area: string): string[] {
  // Convert user-friendly name to lowercase and remove spaces
  const normalizedArea = area.toLowerCase().replace(/\s+/g, '-');
  
  // Direct mapping if it's a specific neighborhood
  if (Object.values(NEIGHBORHOOD_GROUPS).flat().includes(normalizedArea)) {
    return [normalizedArea];
  }
  
  // Return group of neighborhoods if it's a broader area
  return NEIGHBORHOOD_GROUPS[normalizedArea] || [];
}

export async function POST(request: Request) {
  try {
    const { query, conversationHistory } = await request.json();

    const messages = [
      {
        role: 'system',
        content: `You are a helpful NYC apartment search assistant. Your goal is to help users find apartments by understanding their preferences and constraints.

You must ALWAYS respond with a valid JSON object and nothing else. The response must follow this format:
{
  "needsMoreInfo": boolean,
  "followUpQuestion": string (if needsMoreInfo is true),
  "areas": string (comma-separated area codes),
  "minBeds": string (optional),
  "maxBeds": string (optional),
  "minBaths": string (optional),
  "minPrice": string (optional),
  "maxPrice": string (optional),
  "noFee": string (optional),
  "additionalPreferences": {
    "mustHave": string[],
    "modernPreference": boolean (optional),
    "naturalLightPreference": boolean (optional),
    "appliancePreference": "new" | "any" (optional)
  }
}

Key parameters you should identify:
- Areas/neighborhoods (valid options: ${USER_FRIENDLY_AREAS.join(', ')})
- Price range (minPrice and maxPrice)
- Number of bedrooms (minBeds and maxBeds)
- Number of bathrooms (minBaths)
- No fee preference (true/false)
- Additional preferences:
  - Must-have amenities (e.g., dishwasher, laundry, etc.)
  - Modern apartment preference
  - Natural light preference
  - Appliance quality preference

If any essential information is missing (area, price, or bedrooms), set needsMoreInfo to true and provide a natural follow-up question.

When responding about neighborhoods, use the friendly names in your conversation, but include the exact area codes in your JSON response.`
      },
      ...conversationHistory,
      { role: 'user', content: query }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.1 // Add low temperature for more consistent JSON formatting
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const rawPreferences = JSON.parse(response);
    
    // Convert user-friendly areas to StreetEasy area codes
    if (rawPreferences.areas) {
      const userAreas = rawPreferences.areas.split(',').map((a: string) => a.trim());
      const streetEasyAreas = userAreas.flatMap(expandAreaToStreetEasyCodes);
      rawPreferences.areas = streetEasyAreas.join(',');
    }

    const processedPreferences = rawPreferences as ProcessedPreferences & {
      needsMoreInfo: boolean;
      followUpQuestion?: string;
    };

    return NextResponse.json(processedPreferences);
  } catch (error) {
    console.error('Error processing search:', error);
    return NextResponse.json(
      { error: 'Failed to process search query' },
      { status: 500 }
    );
  }
} 