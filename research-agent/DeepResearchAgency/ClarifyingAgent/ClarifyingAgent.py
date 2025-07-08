import os

from agency_swarm import Agent
from pydantic import BaseModel


class Clarifications(BaseModel):
    """
    Structured output for the Clarifying Agent.

    Contains a list of clarification questions to gather more context
    for research tasks.
    """

    questions: list[str]


class ClarifyingAgent(Agent):
    def __init__(self, instruction_builder_agent):
        # Load instruction from file
        instructions_path = os.path.join(os.path.dirname(__file__), "instructions.md")
        with open(instructions_path, "r", encoding="utf-8") as f:
            instructions = f.read()

        super().__init__(
            name="Clarifying Questions Agent",
            model="gpt-4.1",
            temperature=0,
            instructions=instructions,
            output_type=Clarifications,
            handoffs=[instruction_builder_agent],
        )
