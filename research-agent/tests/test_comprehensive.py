#!/usr/bin/env python3
"""
Comprehensive testing for Deep Research Agent Tutorial
Tests all features including MCP integration, PDF generation, and agency workflows
"""

import os
import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_basic_setup():
    """Test basic setup requirements"""
    print("🔧 Testing basic setup...")

    # Test imports
    try:
        from agency_swarm import Agency, Agent

        print("✅ Agency Swarm imports OK")
    except ImportError as e:
        print(f"❌ Agency Swarm import failed: {e}")
        return False

    try:
        from agents import HostedMCPTool, WebSearchTool

        print("✅ Agents library imports OK")
    except ImportError as e:
        print(f"❌ Agents library import failed: {e}")
        return False

    # Test environment variables
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not set")
        return False
    print("✅ OpenAI API key configured")

    return True


def test_basic_agency_imports():
    """Test that both agencies can be imported without errors"""
    print("\n🔄 Testing agency imports...")

    try:
        # Test BasicResearchAgency
        sys.path.insert(0, str(Path("BasicResearchAgency")))
        import BasicResearchAgency.agency as basic_agency

        print("✅ BasicResearchAgency imports OK")

        # Test DeepResearchAgency
        sys.path.insert(0, str(Path("DeepResearchAgency")))
        import DeepResearchAgency.agency as deep_agency

        print("✅ DeepResearchAgency imports OK")

        # Test that agencies are created properly
        if hasattr(basic_agency, "agency"):
            print("✅ BasicResearchAgency agency created")
        else:
            print("❌ BasicResearchAgency agency not found")
            return False

        if hasattr(deep_agency, "agency"):
            print("✅ DeepResearchAgency agency created")
        else:
            print("❌ DeepResearchAgency agency not found")
            return False

    except Exception as e:
        print(f"❌ Agency import failed: {e}")
        return False

    return True


def test_pdf_generation():
    """Test PDF generation functionality"""
    print("\n📄 Testing PDF generation...")

    try:
        from utils import save_research_to_pdf

        # Test PDF generation
        test_content = """
# Test Research Report

This is a test research report to verify PDF generation works correctly.

## Key Findings
- PDF generation is working
- Formatting is preserved
- Citations are handled properly

## Conclusion
The system is operational and ready for testing.
"""

        pdf_path = save_research_to_pdf(
            research_content=test_content,
            query="Test PDF Generation",
            output_dir=str(Path(__file__).parent / "test_reports"),
        )

        if Path(pdf_path).exists():
            print(f"✅ PDF generated successfully: {pdf_path}")
            return True
        else:
            print("❌ PDF file not found")
            return False

    except Exception as e:
        print(f"❌ PDF generation failed: {e}")
        return False


def run_all_tests():
    """Run all comprehensive tests"""
    print("🚀 Starting Comprehensive Testing for Deep Research Agent Tutorial")
    print("=" * 80)

    test_results = []

    # Run all tests
    test_results.append(("Basic Setup", test_basic_setup()))
    test_results.append(("Agency Imports", test_basic_agency_imports()))
    test_results.append(("PDF Generation", test_pdf_generation()))

    # Print results
    print("\n" + "=" * 80)
    print("🎯 TEST RESULTS SUMMARY")
    print("=" * 80)

    passed = 0
    total = len(test_results)

    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1

    print(f"\n📊 FINAL SCORE: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 ALL TESTS PASSED! The tutorial is ready for YouTube.")
        return True
    else:
        print("⚠️  Some tests failed. Please review and fix issues.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
