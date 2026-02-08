import fs from 'fs';
import path from 'path';

interface ChunkInfo {
  name: string;
  size: number;
  exists: boolean;
  references: string[];
}

/**
 * Validates that all chunk references in index.html exist in the build output
 * Prevents deployment of broken dynamic imports
 */
export function validateChunkReferences(): void {
  console.log('🔍 Validating chunk references...');

  const distDir = path.resolve(process.cwd(), 'dist');
  const indexPath = path.join(distDir, 'index.html');
  const assetsDir = path.join(distDir, 'assets');

  if (!fs.existsSync(indexPath)) {
    throw new Error('❌ index.html not found in dist directory. Run build first.');
  }

  if (!fs.existsSync(assetsDir)) {
    throw new Error('❌ assets directory not found in dist directory.');
  }

  // Read index.html and extract chunk references
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  // Extract script and modulepreload references
  const scriptMatches = indexContent.match(/src="\/assets\/([^"]+\.js)"/g) || [];
  const preloadMatches = indexContent.match(/href="\/assets\/([^"]+\.js)"/g) || [];

  const referencedChunks = new Set<string>();

  // Parse script references
  scriptMatches.forEach(match => {
    const chunk = match.match(/assets\/([^"]+\.js)/)?.[1];
    if (chunk) referencedChunks.add(chunk);
  });

  // Parse modulepreload references
  preloadMatches.forEach(match => {
    const chunk = match.match(/assets\/([^"]+\.js)/)?.[1];
    if (chunk) referencedChunks.add(chunk);
  });

  // Get all actual chunks in assets directory
  const actualChunks = fs.readdirSync(assetsDir)
    .filter(file => file.endsWith('.js'))
    .reduce((acc, file) => {
      const stats = fs.statSync(path.join(assetsDir, file));
      acc[file] = {
        name: file,
        size: stats.size,
        exists: true,
        references: []
      };
      return acc;
    }, {} as Record<string, ChunkInfo>);

  // Validate references
  const issues: string[] = [];
  let totalSize = 0;
  let largeChunks: Array<{ name: string; size: number }> = [];

  console.log('\n📊 Chunk Analysis:');
  console.log('='.repeat(60));

  referencedChunks.forEach(chunkName => {
    if (!actualChunks[chunkName]) {
      issues.push(`❌ Referenced chunk not found: ${chunkName}`);
    } else {
      const chunk = actualChunks[chunkName];
      const sizeKB = Math.round(chunk.size / 1024);
      totalSize += chunk.size;

      console.log(`✅ ${chunkName.padEnd(40)} ${sizeKB.toString().padStart(6)} KB`);

      // Flag chunks over 300KB as potentially problematic
      if (chunk.size > 300 * 1024) {
        largeChunks.push({ name: chunkName, size: sizeKB });
      }
    }
  });

  // Check for unreferenced chunks (potential dead code)
  const unreferencedChunks = Object.keys(actualChunks).filter(chunk => !referencedChunks.has(chunk));
  if (unreferencedChunks.length > 0) {
    console.log('\n⚠️  Unreferenced chunks (potential dead code):');
    unreferencedChunks.forEach(chunk => {
      const sizeKB = Math.round(actualChunks[chunk].size / 1024);
      console.log(`   ${chunk.padEnd(40)} ${sizeKB.toString().padStart(6)} KB`);
    });
  }

  console.log('='.repeat(60));
  console.log(`📦 Total referenced chunks: ${referencedChunks.size}`);
  console.log(`📏 Total size: ${Math.round(totalSize / 1024)} KB`);

  if (largeChunks.length > 0) {
    console.log('\n⚠️  Large chunks (>300KB):');
    largeChunks.forEach(chunk => {
      console.log(`   ${chunk.name}: ${chunk.size} KB`);
    });
  }

  // Critical Timeline and Conversations chunks
  const criticalChunks = Array.from(referencedChunks).filter(chunk =>
    chunk.includes('Timeline') ||
    chunk.includes('Conversations') ||
    chunk.includes('timeline-') ||
    chunk.includes('planning-')
  );

  if (criticalChunks.length > 0) {
    console.log('\n🎯 Critical page chunks:');
    criticalChunks.forEach(chunk => {
      if (actualChunks[chunk]) {
        const sizeKB = Math.round(actualChunks[chunk].size / 1024);
        console.log(`   ${chunk}: ${sizeKB} KB`);
      }
    });
  }

  // Report issues
  if (issues.length > 0) {
    console.error('\n💥 Validation Errors:');
    issues.forEach(issue => console.error(`   ${issue}`));
    throw new Error(`Build validation failed with ${issues.length} error(s)`);
  }

  console.log('\n✅ All chunk references validated successfully!');

  // Performance recommendations
  if (largeChunks.length > 0) {
    console.log('\n💡 Performance Recommendations:');
    console.log('   Consider splitting large chunks further to improve loading');
    console.log('   Add modulepreload hints for critical chunks');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    validateChunkReferences();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}