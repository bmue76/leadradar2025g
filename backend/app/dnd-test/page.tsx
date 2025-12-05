'use client';

import React, { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { UniqueIdentifier } from '@dnd-kit/core';

type ItemId = UniqueIdentifier;

const INITIAL_ITEMS: ItemId[] = ['Feld A', 'Feld B', 'Feld C', 'Feld D'];

function SortableItem({ id }: { id: ItemId }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.7 : 1,
    cursor: 'grab',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="mb-2 flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"
    >
      <span className="text-sm font-medium text-slate-800">{id}</span>
      {/* Drag-Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="ml-3 inline-flex items-center justify-center rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
      >
        ⠿
      </button>
    </li>
  );
}

export default function DndTestPage() {
  const [items, setItems] = useState<ItemId[]>(INITIAL_ITEMS);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // erst nach ein paar Pixeln Bewegung draggen
      },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          DnD-Testliste – LeadRadar2025g
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Zieh die Einträge über das Handle (⠿), um die Reihenfolge zu ändern.
        </p>
      </header>

      <main>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ul className="mt-2">
              {items.map((id) => (
                <SortableItem key={id} id={id} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </main>
    </div>
  );
}
