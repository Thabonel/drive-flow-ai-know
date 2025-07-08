#!/usr/bin/env python3
"""
Deep Research Agency

Four-agent handoffs pattern with clarification workflow.
Triage → [Clarifying, Instruction] → Research using deep research model.
"""
from agency_swarm import Agency, Agent
from ClarifyingAgent.ClarifyingAgent import ClarifyingAgent
from InstructionBuilderAgent.InstructionBuilderAgent import InstructionBuilderAgent
from ResearchAgent.ResearchAgent import ResearchAgent
from utils import run_agency_demo

import os
import sys

from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

research_agent = ResearchAgent()
instruction_builder_agent = InstructionBuilderAgent(research_agent)
clarifying_agent = ClarifyingAgent(instruction_builder_agent)

triage_agent = Agent(
    name="Triage Agent",
    instructions=(
        "Decide whether clarifications are required.\n"
        "• If yes → call transfer_to_clarifying_questions_agent\n"
        "• If no  → call transfer_to_research_instruction_agent\n"
        "Return exactly ONE function-call."
    ),
    handoffs=[clarifying_agent, instruction_builder_agent],
)

agency = Agency(triage_agent)


if __name__ == "__main__":
    run_agency_demo(agency)
