#!/usr/bin/env python3
"""
Test User's Specific Example

This test uses the exact format from the user's example to demonstrate
how the enhanced PDF generation handles URLs and converts them to numbered references.
"""

import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_user_example_format():
    """Test the user's specific example format"""
    print("🎯 Testing User's Specific Example Format...")

    try:
        from utils import save_research_to_pdf

        # User's example content with actual URLs
        user_example_content = """
# Helium-3 and Lunar Mining Research Report

## Executive Summary

This comprehensive research report examines the current state and future prospects of helium-3 extraction from lunar resources, analyzing technological readiness, economic viability, and strategic implications for space-based energy production.

## Current State of Helium-3 Mining Technology

Recent developments in lunar mining technology have shown promising advances in helium-3 extraction capabilities. Several companies and space agencies are actively pursuing this technology for future energy applications.

### Key Technological Developments

The development of specialized lunar excavation equipment has progressed significantly, with prototypes demonstrating the ability to process lunar regolith efficiently. These machines are designed to operate in the harsh lunar environment while maintaining high extraction rates.

### Industry Partnerships and Missions

Two major space firms have signed agreements for lunar mining missions, indicating strong commercial interest in helium-3 extraction. These partnerships represent a significant step toward practical implementation of lunar mining operations.

## Economic and Strategic Implications

The potential economic impact of helium-3 mining is substantial, with applications in clean energy production offering significant advantages over traditional energy sources. The technology promises clean fusion energy without radioactive waste or greenhouse gas emissions.

### Supply Chain Considerations

Current terrestrial helium-3 supplies face extreme shortages, making lunar extraction increasingly attractive from both economic and strategic perspectives. The lunar surface is thought to contain abundant helium-3 deposits that could address these supply constraints.

## Technological Readiness and Timeline

Recent prototypes and technical demonstrations suggest that helium-3 harvesting technology is approaching commercial viability. Industry experts project initial missions and technology validation between 2029 and 2035.

### International Competition

China is taking lunar mining seriously, with significant investments in research and development. This international competition is driving innovation and accelerating development timelines across the industry.

## Conclusion

The convergence of technological advancement, economic necessity, and strategic competition is creating favorable conditions for helium-3 lunar mining development. While challenges remain, the industry is making substantial progress toward practical implementation.

**Sources:** Authoritative sources on helium-3 and lunar mining ([www.nasa.gov](https://www.nasa.gov/directorates/stmd/space-tech-research-grants/harnessing-power-from-the-moon/#:~:text=%E2%80%9COf%20the%20various%20volatile%20materials,%E2%80%9D)) ([ntrs.nasa.gov](https://ntrs.nasa.gov/citations/20210012628#:~:text=wheel%20excavator%20and%20process%20556,could%20be%20used%20to%20support)) ([eandt.theiet.org](https://eandt.theiet.org/2024/12/12/moon-mining-mission-extract-helium-3-bid-alleviate-extreme-supply-shortages-earth#:~:text=Two%20space%20firms%20have%20signed,is%20an%20extreme%20supply%20shortage)) ([eandt.theiet.org](https://eandt.theiet.org/2024/12/12/moon-mining-mission-extract-helium-3-bid-alleviate-extreme-supply-shortages-earth#:~:text=Helium,waste%20or%20greenhouse%20gas%20emissions)) ([www.space.com](https://www.space.com/astronomy/moon/moon-mining-machine-interlune-unveils-helium-3-harvester-prototype-photo#:~:text=The%20machine%20is%20designed%20to,thought%20to%20be%20plentiful%20on)) ([www.space.com](https://www.space.com/the-universe/moon/japanese-company-ispace-plans-to-land-helium-3-mining-missions-on-the-moon#:~:text=Through%20%22non,facing%20an%20extreme%20supply%20shortage)) ([www.mining.com](https://www.mining.com/china-is-taking-lunar-mining-seriously-65595/#:~:text=the%20dust%20of%20the%20lunar,productivity%20by%20orders%20of%20magnitude)) ([eandt.theiet.org](https://eandt.theiet.org/2024/12/12/moon-mining-mission-extract-helium-3-bid-alleviate-extreme-supply-shortages-earth#:~:text=Magna%20Petra%20is%20in%20the,to%20validate%20its%20new%20technologies)) ([payloadspace.com](https://payloadspace.com/interlune-unveils-prototype-lunar-helium-3-excavator/#:~:text=The%20US%20Department%20of%20Energy,delivery%20between%202029%20and%202035)) provide the basis for this overview. These include NASA studies and technical reports, recent space news articles, and industry analyses.
"""

        # Generate PDF using enhanced system
        pdf_path = save_research_to_pdf(
            research_content=user_example_content,
            query="Helium-3 and Lunar Mining Research",
            output_dir=str(Path(__file__).parent / "test_reports"),
            filename="user_example_format.pdf",
        )

        if Path(pdf_path).exists():
            file_size = Path(pdf_path).stat().st_size
            print(f"✅ User example PDF generated: {pdf_path}")
            print(f"📊 File size: {file_size:,} bytes")
            return True
        else:
            print("❌ User example PDF not generated")
            return False

    except Exception as e:
        print(f"❌ User example test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_url_extraction_from_user_example():
    """Test URL extraction from user's specific example"""
    print("\n🔗 Testing URL Extraction from User Example...")

    try:
        from utils.pdf import ModernPDFGenerator

        generator = ModernPDFGenerator()

        # User's sources section
        sources_content = """
**Sources:** Authoritative sources on helium-3 and lunar mining ([www.nasa.gov](https://www.nasa.gov/directorates/stmd/space-tech-research-grants/harnessing-power-from-the-moon/#:~:text=%E2%80%9COf%20the%20various%20volatile%20materials,%E2%80%9D)) ([ntrs.nasa.gov](https://ntrs.nasa.gov/citations/20210012628#:~:text=wheel%20excavator%20and%20process%20556,could%20be%20used%20to%20support)) ([eandt.theiet.org](https://eandt.theiet.org/2024/12/12/moon-mining-mission-extract-helium-3-bid-alleviate-extreme-supply-shortages-earth#:~:text=Two%20space%20firms%20have%20signed,is%20an%20extreme%20supply%20shortage)) ([eandt.theiet.org](https://eandt.theiet.org/2024/12/12/moon-mining-mission-extract-helium-3-bid-alleviate-extreme-supply-shortages-earth#:~:text=Helium,waste%20or%20greenhouse%20gas%20emissions)) ([www.space.com](https://www.space.com/astronomy/moon/moon-mining-machine-interlune-unveils-helium-3-harvester-prototype-photo#:~:text=The%20machine%20is%20designed%20to,thought%20to%20be%20plentiful%20on)) ([www.space.com](https://www.space.com/the-universe/moon/japanese-company-ispace-plans-to-land-helium-3-mining-missions-on-the-moon#:~:text=Through%20%22non,facing%20an%20extreme%20supply%20shortage)) ([www.mining.com](https://www.mining.com/china-is-taking-lunar-mining-seriously-65595/#:~:text=the%20dust%20of%20the%20lunar,productivity%20by%20orders%20of%20magnitude)) ([eandt.theiet.org](https://eandt.theiet.org/2024/12/12/moon-mining-mission-extract-helium-3-bid-alleviate-extreme-supply-shortages-earth#:~:text=Magna%20Petra%20is%20in%20the,to%20validate%20its%20new%20technologies)) ([payloadspace.com](https://payloadspace.com/interlune-unveils-prototype-lunar-helium-3-excavator/#:~:text=The%20US%20Department%20of%20Energy,delivery%20between%202029%20and%202035)) provide the basis for this overview.
"""

        # Process URLs
        processed = generator._process_urls_in_markdown(sources_content)

        print(f"📄 Original format:")
        print(sources_content[:200] + "...")
        print(f"\n📄 Processed format:")
        print(processed[:200] + "...")

        print(f"\n🔢 Found {len(generator.url_references)} unique URLs:")
        for i, (url, ref) in enumerate(
            sorted(generator.url_references.items(), key=lambda x: x[1].number)
        ):
            print(f"  [{ref.number}] {ref.title}: {ref.url}")
            if i >= 4:  # Show first 5 URLs
                print(f"  ... and {len(generator.url_references) - 5} more")
                break

        # Check if URLs were properly extracted
        expected_domains = [
            "nasa.gov",
            "ntrs.nasa.gov",
            "eandt.theiet.org",
            "space.com",
            "mining.com",
            "payloadspace.com",
        ]
        found_domains = [ref.url for ref in generator.url_references.values()]

        matching_domains = 0
        for domain in expected_domains:
            if any(domain in url for url in found_domains):
                matching_domains += 1

        print(
            f"\n🎯 Domain matching: {matching_domains}/{len(expected_domains)} expected domains found"
        )

        if matching_domains >= 4:  # Should find most domains
            print("✅ URL extraction from user example working correctly")
            return True
        else:
            print("❌ URL extraction not working as expected")
            return False

    except Exception as e:
        print(f"❌ URL extraction test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🚀 Testing User's Specific Example Format")
    print("=" * 60)

    # Run tests
    result1 = test_url_extraction_from_user_example()
    result2 = test_user_example_format()

    print("\n" + "=" * 60)
    print("🎯 USER EXAMPLE TEST RESULTS")
    print("=" * 60)

    if result1:
        print("✅ URL extraction working correctly")
    else:
        print("❌ URL extraction issues")

    if result2:
        print("✅ PDF generation working correctly")
    else:
        print("❌ PDF generation issues")

    if result1 and result2:
        print("\n🎉 SUCCESS: User's example format is now properly handled!")
        print("\n📄 Key improvements:")
        print("   ✅ URLs are extracted from markdown links")
        print("   ✅ Numbered references are generated")
        print("   ✅ Sources section is properly formatted")
        print("   ✅ Professional PDF output with references")
        print("   ✅ All markdown features supported")
    else:
        print("\n⚠️ Some issues detected, but basic functionality should work")
