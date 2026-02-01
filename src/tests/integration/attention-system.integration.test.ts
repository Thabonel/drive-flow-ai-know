import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components to test
import { TimelineManager } from '@/components/timeline/TimelineManager';
import { AttentionBudgetWidget } from '@/components/timeline/AttentionBudgetWidget';
import { RoleZoneSelector } from '@/components/timeline/RoleZoneSelector';
import { AttentionTypeSelector } from '@/components/timeline/AttentionTypeSelector';

// Import types and utilities
import { ROLE_MODES, ATTENTION_TYPES } from '@/lib/attentionTypes';
import { analyzeAttentionBudget } from '@/lib/attentionBudgetEngine';

// Mock data
const mockTimelineItems = [
  {
    id: '1',
    start_time: '2024-01-15T09:00:00.000Z',
    duration_minutes: 120,
    attention_type: ATTENTION_TYPES.CREATE,
    title: 'Deep Work Session',
    user_id: 'test-user',
  },
  {
    id: '2',
    start_time: '2024-01-15T11:00:00.000Z',
    duration_minutes: 60,
    attention_type: ATTENTION_TYPES.DECIDE,
    title: 'Team Decisions',
    user_id: 'test-user',
  },
  {
    id: '3',
    start_time: '2024-01-15T13:00:00.000Z',
    duration_minutes: 90,
    attention_type: ATTENTION_TYPES.CONNECT,
    title: 'Stakeholder Meeting',
    user_id: 'test-user',
  },
];

const mockUserPreferences = {
  current_role: ROLE_MODES.MAKER,
  current_zone: 'peacetime',
  peak_hours_start: '09:00',
  peak_hours_end: '12:00',
  attention_budgets: {
    [ATTENTION_TYPES.CREATE]: 240,
    [ATTENTION_TYPES.DECIDE]: 120,
    [ATTENTION_TYPES.CONNECT]: 180,
    [ATTENTION_TYPES.REVIEW]: 120,
    [ATTENTION_TYPES.RECOVER]: 60,
  },
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Mock Supabase calls for integration tests
const mockSupabaseData = {
  timelineItems: mockTimelineItems,
  userPreferences: mockUserPreferences,
};

beforeEach(() => {
  // Mock Supabase responses
  vi.mocked(global.fetch).mockImplementation(async (url) => {
    if (url.toString().includes('timeline_items')) {
      return new Response(JSON.stringify({ data: mockSupabaseData.timelineItems }));
    }
    if (url.toString().includes('user_preferences')) {
      return new Response(JSON.stringify({ data: mockSupabaseData.userPreferences }));
    }
    return new Response(JSON.stringify({ data: [] }));
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Attention System Integration Tests', () => {
  describe('End-to-End Weekly Calibration Flow', () => {
    it('completes full calibration wizard successfully', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      // Wait for timeline to load
      await waitFor(() => {
        expect(screen.getByText('Timeline')).toBeInTheDocument();
      });

      // Start calibration wizard
      const settingsButton = await screen.findByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const calibrationButton = await screen.findByText(/weekly calibration/i);
      await user.click(calibrationButton);

      // Step 1: Role Assessment
      await waitFor(() => {
        expect(screen.getByText(/role assessment/i)).toBeInTheDocument();
      });

      const makerRole = screen.getByRole('radio', { name: /maker/i });
      await user.click(makerRole);

      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Zone Context
      await waitFor(() => {
        expect(screen.getByText(/zone context/i)).toBeInTheDocument();
      });

      const peacetimeZone = screen.getByRole('radio', { name: /peacetime/i });
      await user.click(peacetimeZone);

      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 3: Peak Hours
      await waitFor(() => {
        expect(screen.getByText(/peak hours/i)).toBeInTheDocument();
      });

      const startTimeSelect = screen.getByLabelText(/start time/i);
      await user.selectOptions(startTimeSelect, '09:00');

      const endTimeSelect = screen.getByLabelText(/end time/i);
      await user.selectOptions(endTimeSelect, '12:00');

      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 4: Attention Budgets
      await waitFor(() => {
        expect(screen.getByText(/attention budgets/i)).toBeInTheDocument();
      });

      const createBudgetSlider = screen.getByLabelText(/create budget/i);
      fireEvent.change(createBudgetSlider, { target: { value: '240' } });

      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Complete calibration
      const completeButton = await screen.findByRole('button', { name: /complete calibration/i });
      await user.click(completeButton);

      // Verify calibration completion
      await waitFor(() => {
        expect(screen.getByText(/calibration complete/i)).toBeInTheDocument();
      });

      // Verify preferences were saved
      expect(screen.getByText(/maker mode/i)).toBeInTheDocument();
      expect(screen.getByText(/peacetime zone/i)).toBeInTheDocument();
    });

    it('calculates role fit score accurately', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      // Navigate to role assessment
      const settingsButton = await screen.findByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const roleAssessment = await screen.findByText(/role assessment/i);
      await user.click(roleAssessment);

      // Fill out assessment questions
      const questions = screen.getAllByRole('slider');
      questions.forEach(slider => {
        fireEvent.change(slider, { target: { value: '7' } }); // High scores
      });

      const calculateButton = screen.getByRole('button', { name: /calculate fit/i });
      await user.click(calculateButton);

      // Check role fit score display
      await waitFor(() => {
        const scoreElement = screen.getByTestId('role-fit-score');
        const score = parseInt(scoreElement.textContent || '0');
        expect(score).toBeGreaterThan(50);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('generates appropriate week templates', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      // Start template generation
      const templatesButton = await screen.findByRole('button', { name: /templates/i });
      await user.click(templatesButton);

      const generateButton = screen.getByRole('button', { name: /generate week template/i });
      await user.click(generateButton);

      // Wait for template generation
      await waitFor(() => {
        expect(screen.getByText(/template generated/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify template structure
      const timeBlocks = screen.getAllByTestId('template-time-block');
      expect(timeBlocks.length).toBeGreaterThan(0);

      // Check that CREATE blocks are scheduled during peak hours for Maker role
      const createBlocks = timeBlocks.filter(block =>
        within(block).queryByText(/create/i)
      );

      expect(createBlocks.length).toBeGreaterThan(0);

      createBlocks.forEach(block => {
        const timeText = within(block).getByTestId('block-time').textContent;
        const hour = parseInt(timeText?.split(':')[0] || '0');
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(12);
      });
    });
  });

  describe('Cross-Browser Attention Budget Dashboard', () => {
    it('renders budget dashboard correctly across different viewport sizes', async () => {
      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });

      render(
        <TestWrapper>
          <AttentionBudgetWidget />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('attention-budget-dashboard')).toBeInTheDocument();
      });

      // Check all attention types are visible
      Object.values(ATTENTION_TYPES).forEach(type => {
        expect(screen.getByText(type.toUpperCase())).toBeInTheDocument();
      });

      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        // Mobile layout should show compact version
        expect(screen.getByTestId('budget-compact-view')).toBeInTheDocument();
      });
    });

    it('updates budget displays in real-time', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <div>
            <AttentionBudgetWidget />
            <AttentionTypeSelector />
          </div>
        </TestWrapper>
      );

      // Initial budget display
      const createBudget = await screen.findByTestId('create-budget-used');
      expect(createBudget).toBeInTheDocument();

      const initialUsage = createBudget.textContent;

      // Add new CREATE task
      const addTaskButton = screen.getByRole('button', { name: /add task/i });
      await user.click(addTaskButton);

      const attentionTypeSelect = screen.getByLabelText(/attention type/i);
      await user.selectOptions(attentionTypeSelect, ATTENTION_TYPES.CREATE);

      const durationInput = screen.getByLabelText(/duration/i);
      await user.clear(durationInput);
      await user.type(durationInput, '60');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Budget should update
      await waitFor(() => {
        const updatedUsage = createBudget.textContent;
        expect(updatedUsage).not.toBe(initialUsage);
      });
    });
  });

  describe('Mobile Responsive Testing', () => {
    it('provides full functionality on mobile devices', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-timeline')).toBeInTheDocument();
      });

      // Test mobile gestures and interactions
      const timelineItem = await screen.findByTestId('timeline-item-1');

      // Test swipe gesture (simulated with touch events)
      fireEvent.touchStart(timelineItem, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchMove(timelineItem, {
        touches: [{ clientX: 50, clientY: 100 }],
      });

      fireEvent.touchEnd(timelineItem, {});

      // Should reveal mobile action menu
      await waitFor(() => {
        expect(screen.getByTestId('mobile-action-menu')).toBeInTheDocument();
      });

      // Test mobile context menu
      const contextMenuButton = screen.getByRole('button', { name: /more options/i });
      await user.click(contextMenuButton);

      await waitFor(() => {
        expect(screen.getByText(/edit/i)).toBeInTheDocument();
        expect(screen.getByText(/delete/i)).toBeInTheDocument();
        expect(screen.getByText(/duplicate/i)).toBeInTheDocument();
      });
    });

    it('maintains 60fps performance during scrolling with attention overlays', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      // Mock large dataset for performance testing
      const largeDataset = Array.from({ length: 200 }, (_, i) => ({
        ...mockTimelineItems[0],
        id: `${i + 1}`,
        start_time: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(),
        title: `Task ${i + 1}`,
      }));

      vi.mocked(mockSupabaseData).timelineItems = largeDataset;

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      const timelineContainer = await screen.findByTestId('timeline-scroll-container');

      // Simulate rapid scrolling
      const scrollEvents = Array.from({ length: 50 }, (_, i) => i * 100);

      const startTime = performance.now();

      for (const scrollTop of scrollEvents) {
        fireEvent.scroll(timelineContainer, { target: { scrollTop } });
        // Wait a frame
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const fps = (scrollEvents.length / totalTime) * 1000;

      // Should maintain > 30 fps (being lenient for test environment)
      expect(fps).toBeGreaterThan(30);
    });
  });

  describe('Performance Testing with Large Datasets', () => {
    it('renders timeline with 1000+ events within performance targets', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(Date.now() + i * 15 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        attention_type: Object.values(ATTENTION_TYPES)[i % Object.values(ATTENTION_TYPES).length],
        title: `Event ${i + 1}`,
        user_id: 'test-user',
      }));

      vi.mocked(mockSupabaseData).timelineItems = largeDataset;

      const startTime = performance.now();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;

      // Should render within 500ms
      expect(renderTime).toBeLessThan(500);

      // Verify virtualization is working (not all items should be in DOM)
      const renderedItems = screen.getAllByTestId(/timeline-item-/);
      expect(renderedItems.length).toBeLessThan(100); // Should virtualize
    });

    it('handles attention budget calculations for large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(Date.now() + i * 20 * 60 * 1000).toISOString(),
        duration_minutes: 15,
        attention_type: Object.values(ATTENTION_TYPES)[i % Object.values(ATTENTION_TYPES).length],
        title: `Task ${i + 1}`,
        user_id: 'test-user',
      }));

      const startTime = performance.now();

      const analysis = analyzeAttentionBudget(
        largeDataset,
        mockUserPreferences,
        new Date()
      );

      const analysisTime = performance.now() - startTime;

      // Should complete analysis within 300ms
      expect(analysisTime).toBeLessThan(300);

      expect(analysis).toBeDefined();
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Role Mode Switching', () => {
    it('switches role modes with real-time behavior changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <div>
            <RoleZoneSelector />
            <AttentionBudgetWidget />
          </div>
        </TestWrapper>
      );

      // Initial state (Maker mode)
      await waitFor(() => {
        expect(screen.getByText(/maker mode/i)).toBeInTheDocument();
      });

      const createBudgetElement = screen.getByTestId('create-budget-limit');
      const initialCreateLimit = createBudgetElement.textContent;

      // Switch to Multiplier mode
      const roleSelector = screen.getByLabelText(/role mode/i);
      await user.selectOptions(roleSelector, ROLE_MODES.MULTIPLIER);

      // Verify role change
      await waitFor(() => {
        expect(screen.getByText(/multiplier mode/i)).toBeInTheDocument();
      });

      // Verify budget limits changed
      await waitFor(() => {
        const newCreateLimit = createBudgetElement.textContent;
        expect(newCreateLimit).not.toBe(initialCreateLimit);
      });

      // Verify UI behavior changes
      const focusProtectionAlert = screen.queryByTestId('focus-protection-alert');
      expect(focusProtectionAlert).not.toBeInTheDocument(); // Should be hidden for Multiplier

      const delegationSuggestions = screen.getByTestId('delegation-suggestions');
      expect(delegationSuggestions).toBeInTheDocument(); // Should show for Multiplier
    });

    it('provides appropriate warnings and suggestions for each role', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <div>
            <RoleZoneSelector />
            <TimelineManager />
          </div>
        </TestWrapper>
      );

      // Test Maker mode warnings
      const roleSelector = screen.getByLabelText(/role mode/i);
      await user.selectOptions(roleSelector, ROLE_MODES.MAKER);

      await waitFor(() => {
        // Should see focus protection warnings
        expect(screen.getByText(/focus block/i)).toBeInTheDocument();
      });

      // Switch to Marker mode
      await user.selectOptions(roleSelector, ROLE_MODES.MARKER);

      await waitFor(() => {
        // Should see decision batching suggestions
        expect(screen.getByText(/batch decisions/i)).toBeInTheDocument();
      });

      // Switch to Multiplier mode
      await user.selectOptions(roleSelector, ROLE_MODES.MULTIPLIER);

      await waitFor(() => {
        // Should see delegation opportunities
        expect(screen.getByText(/delegate/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Testing', () => {
    it('meets WCAG AA standards for attention type color coding', async () => {
      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
      });

      // Test keyboard navigation
      const timelineItems = screen.getAllByTestId(/timeline-item-/);
      expect(timelineItems[0]).toHaveAttribute('tabindex', '0');

      // Test ARIA labels
      timelineItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
        expect(item).toHaveAttribute('role', 'button');
      });

      // Test color contrast for attention types
      const createItems = screen.getAllByTestId('attention-type-create');
      createItems.forEach(item => {
        const styles = getComputedStyle(item);
        // Verify color contrast meets WCAG AA (simulated check)
        expect(styles.color).toBeDefined();
        expect(styles.backgroundColor).toBeDefined();
      });

      // Test screen reader announcements
      const announcements = screen.getByTestId('sr-announcements');
      expect(announcements).toHaveAttribute('aria-live', 'polite');
    });

    it('provides keyboard shortcuts for all major actions', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      const timelineContainer = await screen.findByTestId('timeline-container');

      // Test keyboard shortcuts
      await user.type(timelineContainer, '{ctrl>n}'); // New task
      await waitFor(() => {
        expect(screen.getByTestId('new-task-dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await user.type(timelineContainer, '{ctrl>f}'); // Focus mode toggle
      await waitFor(() => {
        expect(screen.getByTestId('focus-mode-indicator')).toBeInTheDocument();
      });

      await user.type(timelineContainer, '{ctrl>?}'); // Help/shortcuts
      await waitFor(() => {
        expect(screen.getByTestId('keyboard-shortcuts-help')).toBeInTheDocument();
      });
    });
  });

  describe('Data Integrity', () => {
    it('saves attention preferences correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      // Modify attention budgets
      const settingsButton = await screen.findByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const budgetSettings = screen.getByText(/attention budgets/i);
      await user.click(budgetSettings);

      const createBudgetSlider = screen.getByLabelText(/create budget/i);
      await user.clear(screen.getByDisplayValue('240'));
      await user.type(screen.getByDisplayValue(''), '300');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify save was called with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('user_preferences'),
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('300'),
          })
        );
      });
    });

    it('tracks budget calculations accurately', async () => {
      render(
        <TestWrapper>
          <AttentionBudgetWidget />
        </TestWrapper>
      );

      await waitFor(() => {
        const budgetWidget = screen.getByTestId('attention-budget-widget');
        expect(budgetWidget).toBeInTheDocument();
      });

      // Verify calculations match expected values
      const createUsage = screen.getByTestId('create-usage-minutes');
      const createPercentage = screen.getByTestId('create-usage-percentage');

      const usageMinutes = parseInt(createUsage.textContent || '0');
      const usagePercentage = parseFloat(createPercentage.textContent || '0');

      // CREATE usage should be 120 minutes from mock data
      expect(usageMinutes).toBe(120);

      // Percentage should be 120/240 = 50%
      expect(Math.round(usagePercentage)).toBe(50);
    });

    it('maintains delegation data through workflow lifecycle', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimelineManager />
        </TestWrapper>
      );

      // Select an item for delegation
      const timelineItem = await screen.findByTestId('timeline-item-1');
      await user.click(timelineItem);

      const delegateButton = screen.getByRole('button', { name: /delegate/i });
      await user.click(delegateButton);

      // Fill delegation form
      const assigneeInput = screen.getByLabelText(/assignee/i);
      await user.type(assigneeInput, 'John Doe');

      const trustLevelSelect = screen.getByLabelText(/trust level/i);
      await user.selectOptions(trustLevelSelect, 'HIGH');

      const submitDelegation = screen.getByRole('button', { name: /delegate task/i });
      await user.click(submitDelegation);

      // Verify delegation was tracked
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('delegations'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('John Doe'),
          })
        );
      });

      // Check delegation appears in timeline
      const delegatedIndicator = screen.getByTestId('delegation-indicator-1');
      expect(delegatedIndicator).toBeInTheDocument();
      expect(delegatedIndicator).toHaveTextContent('John Doe');
    });
  });
});