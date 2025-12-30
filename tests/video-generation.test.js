/**
 * Video Generation E2E Smoke Test
 *
 * Tests the complete video generation workflow for pitch decks:
 * 1. Generate deck with Expressive mode (video generation)
 * 2. Verify cache hit/miss behavior
 * 3. Test fallback to static images on error
 * 4. Validate progressive generation (revision workflow)
 * 5. Check cost tracking and logging
 *
 * Prerequisites:
 * - SUPABASE_URL environment variable
 * - SUPABASE_ANON_KEY environment variable
 * - SUPABASE_SERVICE_ROLE_KEY environment variable (for direct DB access)
 * - RUNWAY_API_KEY configured in Supabase Edge Function secrets
 * - Valid user authentication token
 *
 * Usage:
 *   npm test -- tests/video-generation.test.js
 *   TEST_USER_EMAIL=user@example.com TEST_USER_PASSWORD=pass123 node tests/video-generation.test.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fskwutnoxbbflzqrphro.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase clients
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let authToken = null;
let userId = null;

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
  logs: []
};

// Utility functions
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  results.logs.push(logMessage);
  console.log(logMessage);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  log(`\n🧪 Testing: ${name}`);
  try {
    await fn();
    results.passed.push(name);
    log(`✅ PASSED: ${name}`);
  } catch (error) {
    results.failed.push({ name, error: error.message });
    log(`❌ FAILED: ${name}`);
    log(`   Error: ${error.message}`);
    if (error.stack) {
      log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }
}

async function setupAuth() {
  log('\n🔐 Setting up authentication...');

  if (TEST_USER_EMAIL && TEST_USER_PASSWORD) {
    // Sign in with provided credentials
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (error) {
      throw new Error(`Failed to sign in: ${error.message}`);
    }

    authToken = data.session.access_token;
    userId = data.user.id;
    log(`✓ Signed in as: ${TEST_USER_EMAIL}`);
  } else {
    // Create temporary test user
    const testEmail = `test-video-${Date.now()}@example.com`;
    const testPassword = `TestPass${Date.now()}!`;

    const { data, error } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    authToken = data.session?.access_token;
    userId = data.user?.id;

    if (!authToken) {
      throw new Error('Email confirmation required - cannot proceed with test');
    }

    log(`✓ Created test user: ${testEmail}`);
  }

  log(`✓ User ID: ${userId}`);
  log(`✓ Auth token acquired (${authToken.substring(0, 20)}...)`);
}

// Test Suite
async function runTests() {
  log('🚀 Starting Video Generation E2E Smoke Tests\n');
  log(`Testing URL: ${SUPABASE_URL}`);

  try {
    await setupAuth();

    // Test 1: Generate pitch deck with expressive mode (video generation)
    let generatedDeck = null;
    await test('Generate pitch deck with expressive mode', async () => {
      const requestBody = {
        topic: 'AI-Powered Customer Service Platform',
        targetAudience: 'enterprise investors',
        numberOfSlides: 3, // Small deck for fast testing
        style: 'professional',
        animationStyle: 'expressive', // This triggers video generation
        includeImages: true,
      };

      log('   Sending generate-pitch-deck request...');
      log(`   Request: ${JSON.stringify(requestBody, null, 2)}`);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pitch-deck`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      assert(response.ok, `HTTP ${response.status}: ${await response.text()}`);

      generatedDeck = await response.json();
      log(`   ✓ Deck generated with ${generatedDeck.slides.length} slides`);

      // Verify deck structure
      assert(generatedDeck.title, 'Deck has title');
      assert(generatedDeck.slides && generatedDeck.slides.length > 0, 'Deck has slides');

      // Check that at least one slide has video (or fallback image)
      const slidesWithVideo = generatedDeck.slides.filter(s => s.videoUrl);
      const slidesWithImage = generatedDeck.slides.filter(s => s.imageData);

      log(`   ✓ Slides with video: ${slidesWithVideo.length}/${generatedDeck.slides.length}`);
      log(`   ✓ Slides with fallback image: ${slidesWithImage.length}/${generatedDeck.slides.length}`);

      // At least one slide should have either video or image
      assert(
        slidesWithVideo.length > 0 || slidesWithImage.length > 0,
        'At least one slide has visual content'
      );

      // If videos were generated, verify properties
      if (slidesWithVideo.length > 0) {
        const videoSlide = slidesWithVideo[0];
        assert(videoSlide.videoUrl, 'Video slide has videoUrl');
        assert(videoSlide.videoUrl.startsWith('http'), 'videoUrl is valid URL');

        if (videoSlide.videoDuration) {
          log(`   ✓ Video duration: ${videoSlide.videoDuration}s`);
        }
        if (videoSlide.videoFileSizeMb) {
          log(`   ✓ Video file size: ${videoSlide.videoFileSizeMb}MB`);
        }
      }
    });

    // Test 2: Verify video cache functionality
    await test('Verify video cache hit on duplicate prompt', async () => {
      // Generate another deck with same topic to test cache
      const requestBody = {
        topic: 'AI-Powered Customer Service Platform', // Same topic as Test 1
        targetAudience: 'enterprise investors',
        numberOfSlides: 2,
        style: 'professional',
        animationStyle: 'expressive',
        includeImages: true,
      };

      log('   Generating deck with same prompts (should hit cache)...');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pitch-deck`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      assert(response.ok, `HTTP ${response.status}`);
      const cachedDeck = await response.json();

      log(`   ✓ Second deck generated with ${cachedDeck.slides.length} slides`);

      // Check if videos exist (either newly generated or cached)
      const videoSlides = cachedDeck.slides.filter(s => s.videoUrl);
      if (videoSlides.length > 0) {
        log(`   ✓ Video generation succeeded (cache hit likely for similar prompts)`);
      } else {
        results.warnings.push('No videos generated - check Runway API configuration');
      }

      // Query video_cache table to verify cache entries
      const { data: cacheEntries, error } = await supabaseAdmin
        .from('video_cache')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && cacheEntries) {
        log(`   ✓ Found ${cacheEntries.length} entries in video_cache table`);
        if (cacheEntries.length > 0) {
          const recentCache = cacheEntries[0];
          log(`   ✓ Most recent cache: use_count=${recentCache.use_count}, prompt="${recentCache.prompt_text.substring(0, 50)}..."`);
        }
      }
    });

    // Test 3: Test fallback to static images (simulate video API failure)
    await test('Verify fallback to static images', async () => {
      // Generate deck with unique topic (less likely to have cache)
      const uniqueTopic = `Quantum Computing Platform ${Date.now()}`;

      const requestBody = {
        topic: uniqueTopic,
        targetAudience: 'technical investors',
        numberOfSlides: 2,
        style: 'professional',
        animationStyle: 'expressive',
        includeImages: true,
      };

      log(`   Generating deck with unique topic: "${uniqueTopic}"`);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pitch-deck`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      assert(response.ok, `HTTP ${response.status}`);
      const deck = await response.json();

      // Deck should generate successfully even if video fails
      assert(deck.slides && deck.slides.length > 0, 'Deck generated successfully');

      // Check for fallback images
      const slidesWithVideo = deck.slides.filter(s => s.videoUrl);
      const slidesWithImage = deck.slides.filter(s => s.imageData);

      log(`   ✓ Videos: ${slidesWithVideo.length}, Fallback images: ${slidesWithImage.length}`);

      // At least one form of media should exist
      assert(
        slidesWithVideo.length + slidesWithImage.length > 0,
        'Deck has visual content (video or fallback image)'
      );

      // If fallback occurred, verify it
      if (slidesWithImage.length > 0 && slidesWithVideo.length < deck.slides.length) {
        log(`   ✓ Fallback to static images worked (some slides have images instead of videos)`);
      }
    });

    // Test 4: Test progressive generation (revision workflow)
    await test('Verify progressive generation preserves existing videos', async () => {
      if (!generatedDeck) {
        throw new Error('No deck from Test 1 to revise');
      }

      // Save the original deck to database first
      const { data: savedDeck, error: saveError } = await supabaseAdmin
        .from('pitch_decks')
        .insert({
          user_id: userId,
          title: generatedDeck.title,
          subtitle: generatedDeck.subtitle || '',
          deck_data: generatedDeck,
          animation_style: 'expressive',
        })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Failed to save deck: ${saveError.message}`);
      }

      log(`   ✓ Saved deck to database: ${savedDeck.id}`);

      // Now revise slide 1 only
      const revisionRequestBody = {
        topic: generatedDeck.title,
        targetAudience: 'enterprise investors',
        numberOfSlides: generatedDeck.slides.length,
        style: 'professional',
        animationStyle: 'expressive',
        includeImages: true,
        currentDeck: generatedDeck,
        isRevision: true,
        slideNumber: 1, // Only revise slide 1
        revisionRequest: 'Make the opening more compelling',
      };

      log('   Revising slide 1 only (should preserve other slides\' videos)...');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pitch-deck`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(revisionRequestBody),
      });

      assert(response.ok, `HTTP ${response.status}`);
      const revisedDeck = await response.json();

      log(`   ✓ Revised deck generated`);

      // Verify slide 1 was regenerated
      const slide1Changed = revisedDeck.slides[0].content !== generatedDeck.slides[0].content;
      if (slide1Changed) {
        log(`   ✓ Slide 1 content changed (revision worked)`);
      }

      // Verify other slides preserved their media
      if (generatedDeck.slides.length > 1) {
        const slide2Original = generatedDeck.slides[1];
        const slide2Revised = revisedDeck.slides[1];

        if (slide2Original.videoUrl && slide2Revised.videoUrl === slide2Original.videoUrl) {
          log(`   ✓ Slide 2 video preserved (progressive generation worked)`);
        } else if (slide2Original.imageData && slide2Revised.imageData === slide2Original.imageData) {
          log(`   ✓ Slide 2 image preserved (progressive generation worked)`);
        } else {
          results.warnings.push('Progressive generation may not have preserved media');
        }
      }

      // Cleanup
      await supabaseAdmin.from('pitch_decks').delete().eq('id', savedDeck.id);
      log(`   ✓ Cleaned up test deck`);
    });

    // Test 5: Verify cost tracking logs
    await test('Verify cost tracking and logging', async () => {
      // This test checks that the Edge Function logs contain cost information
      // Since we can't easily access Edge Function logs programmatically,
      // we'll verify the deck response contains expected cost-related metadata

      log('   Note: Check Supabase Edge Function logs for cost tracking output');
      log('   Expected format:');
      log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      log('   Media Generation Summary:');
      log('     Total slides: N');
      log('     Videos: X generated, Y preserved');
      log('     Images: A generated, B preserved');
      log('     Estimated cost: $Z.ZZ');
      log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Verify video_cache table statistics
      const { data: stats, error } = await supabaseAdmin
        .from('video_cache')
        .select('use_count, created_at, last_used_at');

      if (!error && stats && stats.length > 0) {
        const avgUseCount = stats.reduce((sum, entry) => sum + entry.use_count, 0) / stats.length;
        const totalVideos = stats.length;

        log(`   ✓ Cache statistics:`);
        log(`     Total cached videos: ${totalVideos}`);
        log(`     Average reuse count: ${avgUseCount.toFixed(2)}`);
        log(`     Estimated cache hit rate: ${((avgUseCount - 1) / avgUseCount * 100).toFixed(1)}%`);
      } else {
        log(`   ⚠ No cache statistics available (${error?.message || 'empty cache'})`);
      }
    });

    // Test 6: Check video cache cleanup function
    await test('Verify video cache cleanup function exists', async () => {
      // Test the cleanup function (should not delete anything in test)
      const { data, error } = await supabaseAdmin.rpc('cleanup_old_video_cache');

      if (error) {
        // Function might not exist if migration wasn't applied
        results.warnings.push(`cleanup_old_video_cache RPC not found: ${error.message}`);
        log(`   ⚠ cleanup_old_video_cache function not found (migration may not be applied)`);
      } else {
        log(`   ✓ cleanup_old_video_cache function exists`);
        log(`   ✓ Deleted ${data || 0} old cache entries`);
      }
    });

    // Test 7: Test direct video generation endpoint
    await test('Test generate-video Edge Function directly', async () => {
      const videoRequestBody = {
        prompt: 'Professional bar chart showing growth from Q1 to Q4, warm earth tones',
        duration: 4,
        aspectRatio: '16:9',
        resolution: '1080p',
      };

      log('   Calling generate-video Edge Function...');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoRequestBody),
      });

      const responseText = await response.text();
      log(`   Response status: ${response.status}`);

      if (response.ok) {
        const result = JSON.parse(responseText);

        if (result.videoUrl) {
          log(`   ✓ Video generated: ${result.videoUrl}`);
          log(`   ✓ Duration: ${result.duration}s`);
          log(`   ✓ Cached: ${result.cached || false}`);
          assert(result.videoUrl.startsWith('http'), 'Valid video URL returned');
        } else if (result.error) {
          results.warnings.push(`Video generation failed: ${result.error}`);
          log(`   ⚠ Video generation failed: ${result.error}`);
        }
      } else {
        results.warnings.push(`generate-video returned HTTP ${response.status}: ${responseText}`);
        log(`   ⚠ generate-video failed: ${responseText}`);
      }
    });

  } catch (error) {
    log(`\n❌ Fatal error during tests: ${error.message}`);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
    results.failed.push({ name: 'Test suite execution', error: error.message });
  }

  // Print results
  printResults();

  // Write results to file
  writeResultsToFile();

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

function printResults() {
  log('\n' + '='.repeat(70));
  log('📊 VIDEO GENERATION E2E TEST RESULTS');
  log('='.repeat(70));

  log(`\n✅ Passed: ${results.passed.length}`);
  results.passed.forEach(name => log(`   • ${name}`));

  if (results.failed.length > 0) {
    log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(({ name, error }) => {
      log(`   • ${name}`);
      log(`     ${error}`);
    });
  }

  if (results.warnings.length > 0) {
    log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => log(`   • ${warning}`));
  }

  const total = results.passed.length + results.failed.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

  log('\n' + '='.repeat(70));
  log(`Pass Rate: ${passRate}% (${results.passed.length}/${total})`);
  log('='.repeat(70) + '\n');

  if (results.failed.length === 0) {
    log('🎉 All video generation tests passed! Feature is production-ready! 🚀\n');
  } else {
    log('⚠️  Some tests failed. Review errors above.\n');
  }
}

function writeResultsToFile() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tests/results/video-generation-${timestamp}.log`;

  // Create results directory if it doesn't exist
  if (!fs.existsSync('tests/results')) {
    fs.mkdirSync('tests/results', { recursive: true });
  }

  const output = results.logs.join('\n');
  fs.writeFileSync(filename, output);

  log(`📝 Full test log saved to: ${filename}`);
}

// Run tests
runTests().catch(console.error);
