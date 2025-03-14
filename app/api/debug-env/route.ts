import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    hasStreetEasyKey: !!process.env.STREETEASY_API_KEY,
    streetEasyKeyLength: process.env.STREETEASY_API_KEY?.length,
    allEnvKeys: Object.keys(process.env).filter(key => !key.startsWith('npm_')),
  };

  return NextResponse.json(envVars);
} 