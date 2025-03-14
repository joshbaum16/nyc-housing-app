import { ImageAnnotatorClient, protos } from '@google-cloud/vision';

export interface ImageAnalysis {
  labels: string[];
  roomType?: string;
  naturalLightScore: number; // 0-10 score
  modernScore: number; // 0-10 score
}

type Color = protos.google.type.IColor;
type DominantColors = protos.google.cloud.vision.v1.IColorInfo[];
type ImageProperties = protos.google.cloud.vision.v1.IImageProperties;
type LocalizedObjectAnnotation = protos.google.cloud.vision.v1.ILocalizedObjectAnnotation;

const ROOM_TYPES = [
  'bedroom', 'bathroom', 'kitchen', 'living room', 'dining room',
  'office', 'closet', 'laundry room'
];

const WINDOW_QUALITY_INDICATORS = {
  large: ['large window', 'floor to ceiling', 'panoramic', 'bay window'],
  standard: ['window', 'daylight'],
  small: ['small window']
};

const MODERN_INDICATORS = [
  'modern', 'contemporary', 'sleek', 'minimalist', 'new', 'renovated',
  'updated', 'stylish', 'trendy', 'chic'
];

const APPLIANCE_INDICATORS = {
  new: ['new appliance', 'stainless steel', 'modern appliance', 'smart appliance'],
  standard: ['appliance', 'refrigerator', 'stove', 'oven', 'dishwasher'],
  outdated: ['old appliance', 'dated', 'outdated']
};

const WINDOW_QUALITY_SCORES = {
  large: 4,
  standard: 2.5,
  small: 1
};

const MODERN_FEATURE_SCORES = {
  appliances: {
    'stainless steel appliance': 2,
    'smart appliance': 2,
    'new appliance': 1.5,
    'modern appliance': 1.5,
    'updated kitchen': 1
  },
  flooring: {
    'hardwood floor': 1.5,
    'modern flooring': 1,
    'new flooring': 1
  },
  fixtures: {
    'recessed lighting': 1,
    'led lighting': 1,
    'modern light fixture': 0.8,
    'modern hardware': 0.8,
    'modern door': 0.7
  }
};

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  try {
    const client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    }) as ImageAnnotatorClient & {
      labelDetection: Function;
      imageProperties: Function;
      objectLocalization: Function;
    };

    const [
      labelDetection,
      imageProperties,
      objectLocalization
    ] = await Promise.all([
      client.labelDetection(imageUrl),
      client.imageProperties(imageUrl),
      client.objectLocalization(imageUrl)
    ]);

    // Extract labels and objects
    const labels = labelDetection[0].labelAnnotations?.map(label => label.description?.toLowerCase() || '') || [];
    const objects = objectLocalization[0].localizedObjectAnnotations || [];

    // Determine room type
    const roomType = ROOM_TYPES.find(type => 
      labels.some(label => label.includes(type))
    );

    // Calculate natural light score (0-10)
    let naturalLightScore = 0;
    
    // Base score from windows
    const windowMatches = labels.filter(label => 
      Object.entries(WINDOW_QUALITY_INDICATORS).some(([quality, indicators]) => 
        indicators.some(indicator => label.includes(indicator))
      )
    );

    // Add points for each window found
    windowMatches.forEach(match => {
      if (WINDOW_QUALITY_INDICATORS.large.some(indicator => match.includes(indicator))) {
        naturalLightScore += WINDOW_QUALITY_SCORES.large;
      } else if (WINDOW_QUALITY_INDICATORS.small.some(indicator => match.includes(indicator))) {
        naturalLightScore += WINDOW_QUALITY_SCORES.small;
      } else {
        naturalLightScore += WINDOW_QUALITY_SCORES.standard;
      }
    });

    // Add bonus for brightness
    const colors = imageProperties[0].imagePropertiesAnnotation?.dominantColors?.colors || [];
    const brightness = calculateBrightness(colors);
    naturalLightScore += brightness * 2; // Add up to 2 points for overall brightness

    // Cap at 10
    naturalLightScore = Math.min(Math.round(naturalLightScore), 10);

    // Calculate modern score (0-10)
    let modernScore = 0;

    // Check for modern features in labels
    Object.entries(MODERN_FEATURE_SCORES).forEach(([category, features]) => {
      Object.entries(features).forEach(([feature, score]) => {
        if (labels.some(label => label.includes(feature))) {
          modernScore += score;
        }
      });
    });

    // Add points for modern objects detected
    const modernObjects = objects.filter(obj => 
      obj.name?.toLowerCase().includes('modern') ||
      obj.name?.toLowerCase().includes('new') ||
      obj.name?.toLowerCase().includes('stainless')
    ).length;
    modernScore += modernObjects * 0.5;

    // Cap at 10
    modernScore = Math.min(Math.round(modernScore), 10);

    return {
      labels,
      roomType,
      naturalLightScore,
      modernScore
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

function calculateBrightness(colors: DominantColors): number {
  if (!colors.length) return 0;
  
  const brightnesses = colors.map(colorInfo => {
    const r = colorInfo.color?.red || 0;
    const g = colorInfo.color?.green || 0;
    const b = colorInfo.color?.blue || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  });

  return brightnesses.reduce((sum, b) => sum + b, 0) / brightnesses.length;
}

function calculateModernScore(
  labels: string[],
  objects: LocalizedObjectAnnotation[]
): number {
  let score = 0;

  // Check for modern indicators in labels
  const modernKeywordsFound = MODERN_INDICATORS.filter(indicator =>
    labels.some(label => label.includes(indicator))
  ).length;
  score += (modernKeywordsFound / MODERN_INDICATORS.length) * 0.5; // 50% of score

  // Check for modern objects and materials
  const modernObjects = [
    'LED light',
    'Smart device',
    'Glass',
    'Steel',
    'Modern furniture'
  ];
  
  const modernObjectsFound = objects.filter(obj =>
    modernObjects.some(item => obj.name?.toLowerCase().includes(item.toLowerCase()))
  ).length;
  score += (modernObjectsFound / modernObjects.length) * 0.3; // 30% of score

  // Add points for brightness (bright spaces often feel more modern)
  const brightness = calculateBrightness([]); // Using empty array as we don't have colors here
  score += brightness * 0.2; // 20% of score

  return Math.min(score, 1); // Normalize to 0-1
} 