import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Card } from '@kanban/shared';
import KanbanCard from './Card';

// Build a self-contained provider tree: react-query + dnd-kit contexts.
// The component uses useSortable and useMutation, both of which need their
// providers in the React tree or they crash on mount.
function renderCard(props: {
  card: Card;
  boardId: string;
  onOpen?: (id: string) => void;
}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <DndContext>
        <SortableContext items={[`card-${props.card.id}`]}>
          <KanbanCard {...props} />
        </SortableContext>
      </DndContext>
    </QueryClientProvider>,
  );
}

const fixture: Card = {
  id: 'card-1',
  columnId: 'col-1',
  title: 'Write integration tests',
  description: null,
  position: 1024,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as Card;

describe('KanbanCard', () => {
  it('renders the card title', () => {
    renderCard({ card: fixture, boardId: 'b-1' });
    expect(screen.getByText('Write integration tests')).toBeInTheDocument();
  });

  it('clicking the card body fires onOpen with the card id (not the inline editor)', () => {
    const onOpen = vi.fn();

    renderCard({ card: fixture, boardId: 'b-1', onOpen });

    // Use fireEvent.click directly: userEvent.click would fire pointerdown
    // first and dnd-kit's listeners can swallow the synthesised click in
    // jsdom. We're testing the click handler wiring, not the drag pipeline.
    const titleEl = screen.getByText('Write integration tests');
    const cardEl = titleEl.parentElement;
    expect(cardEl).not.toBeNull();
    fireEvent.click(cardEl as HTMLElement);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('card-1');

    // The inline editor's textarea must not have appeared — that would be
    // the regression where body-click was wired to "edit title" instead of
    // "open detail modal".
    expect(
      screen.queryByPlaceholderText(/Card title/i),
    ).not.toBeInTheDocument();
  });

  it('clicking the edit button opens the inline editor (and does NOT call onOpen)', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();

    renderCard({ card: fixture, boardId: 'b-1', onOpen });

    await user.click(screen.getByLabelText('Edit card'));

    expect(screen.getByPlaceholderText(/Card title/i)).toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
  });
});
