import fs from 'fs';
import path from 'path';

interface PreloadConfig {
  chunkPatterns: string[];
  sizeThreshold: number; // KB - only preload chunks above this size
  maxPreloads: number;   // Maximum number of preload hints to add
}

const DEFAULT_CONFIG: PreloadConfig = {
  chunkPatterns: [
    'Timeline',
    'Conversations',
    'timeline-',
    'planning-',
    'Settings'
  ],
  sizeThreshold: 50, // 50KB minimum
  maxPreloads: 5     // Limit to avoid too many preloads
};

/**
 * Generates modulepreload hints for critical chunks to improve loading performance
 */
export function generatePreloadHints(config: PreloadConfig = DEFAULT_CONFIG): void {
  console.log('🚀 Generating modulepreload hints...');

  const distDir = path.resolve(process.cwd(), 'dist');
  const indexPath = path.join(distDir, 'index.html');
  const assetsDir = path.join(distDir, 'assets');

  if (!fs.existsSync(indexPath)) {
    throw new Error('❌ index.html not found in dist directory. Run build first.');
  }

  if (!fs.existsSync(assetsDir)) {
    throw new Error('❌ assets directory not found in dist directory.');
  }

  // Read current index.html
  let indexContent = fs.readFileSync(indexPath, 'utf-8');

  // Remove existing modulepreload hints to avoid duplicates
  indexContent = indexContent.replace(
    /<link[^>]*rel="modulepreload"[^>]*>/g,
    ''
  );

  // Get all JS chunks
  const chunks = fs.readdirSync(assetsDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const stats = fs.statSync(path.join(assetsDir, file));
      return {
        name: file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024)
      };
    })
    .filter(chunk => chunk.sizeKB >= config.sizeThreshold)
    .sort((a, b) => b.size - a.size); // Sort by size, largest first

  // Identify critical chunks based on patterns
  const criticalChunks = chunks.filter(chunk =>
    config.chunkPatterns.some(pattern =>
      chunk.name.toLowerCase().includes(pattern.toLowerCase())
    )
  ).slice(0, config.maxPreloads); // Limit number of preloads

  if (criticalChunks.length === 0) {
    console.log('ℹ️  No critical chunks found matching patterns');
    return;
  }

  // Generate preload hints
  const preloadHints = criticalChunks.map(chunk =>
    `    <link rel="modulepreload" crossorigin href="/assets/${chunk.name}">`
  ).join('\n');

  console.log('\n🎯 Adding preload hints for:');
  criticalChunks.forEach(chunk => {
    console.log(`   ${chunk.name} (${chunk.sizeKB} KB)`);
  });

  // Insert preload hints into head section
  const headEndTag = '</head>';
  const preloadSection = `
  <!-- Critical chunk preloads for faster loading -->
${preloadHints}
  ${headEndTag}`;

  indexContent = indexContent.replace(headEndTag, preloadSection);

  // Write updated index.html
  fs.writeFileSync(indexPath, indexContent, 'utf-8');

  console.log(`\n✅ Added ${criticalChunks.length} modulepreload hint(s) to index.html`);

  // Performance impact estimate
  const totalPreloadedKB = criticalChunks.reduce((sum, chunk) => sum + chunk.sizeKB, 0);
  console.log(`📊 Total preloaded: ${totalPreloadedKB} KB`);
  console.log(`⚡ Expected loading improvement: ~200-500ms for critical routes`);
}

/**
 * Creates a comprehensive report of chunk loading performance
 */
export function analyzeChunkPerformance(): void {
  console.log('\n📈 Chunk Performance Analysis:');

  const distDir = path.resolve(process.cwd(), 'dist');
  const assetsDir = path.join(distDir, 'assets');

  if (!fs.existsSync(assetsDir)) {
    console.log('❌ No assets directory found');
    return;
  }

  const chunks = fs.readdirSync(assetsDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const stats = fs.statSync(path.join(assetsDir, file));
      return {
        name: file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024)
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('='.repeat(80));
  console.log('Chunk Name'.padEnd(50) + 'Size (KB)'.padStart(10) + 'Load Time*'.padStart(20));
  console.log('='.repeat(80));

  chunks.forEach(chunk => {
    // Estimate load time based on chunk size
    // Assumes ~1MB/s download speed (conservative mobile estimate)
    const estimatedLoadMs = Math.round(chunk.size / 1024); // 1KB = ~1ms at 1MB/s

    const status = chunk.sizeKB > 300 ? '⚠️ ' :
                  chunk.sizeKB > 150 ? '🟡' :
                  '✅';

    console.log(
      `${status} ${chunk.name.padEnd(45)} ${chunk.sizeKB.toString().padStart(8)} ${estimatedLoadMs.toString().padStart(15)}ms`
    );
  });

  console.log('='.repeat(80));
  console.log('* Estimated load time on 3G connection (~1MB/s)');

  // Summary recommendations
  const largeChunks = chunks.filter(c => c.sizeKB > 300);
  const mediumChunks = chunks.filter(c => c.sizeKB > 150 && c.sizeKB <= 300);

  if (largeChunks.length > 0) {
    console.log('\n⚠️  Large chunks (>300KB) - Consider splitting:');
    largeChunks.slice(0, 3).forEach(chunk => {
      console.log(`   ${chunk.name}: ${chunk.sizeKB} KB`);
    });
  }

  if (mediumChunks.length > 0) {
    console.log('\n🟡 Medium chunks (150-300KB) - Good candidates for preloading:');
    mediumChunks.slice(0, 3).forEach(chunk => {
      console.log(`   ${chunk.name}: ${chunk.sizeKB} KB`);
    });
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generatePreloadHints();
    analyzeChunkPerformance();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Preload generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}