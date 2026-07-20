import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Slide, DeckFrontmatter } from "@/lib/deckStore";
import SlidePreview from "./SlidePreview";

interface SortableItemProps {
  slide: Slide;
  frontmatter: DeckFrontmatter;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableItem({ slide, frontmatter, isSelected, onSelect }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <button
        className={`w-full text-left rounded-lg overflow-hidden border-2 transition-all ${
          isSelected ? "border-indigo-500" : "border-transparent hover:border-zinc-600"
        }`}
        onClick={onSelect}
      >
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <SlidePreview slide={slide} theme={frontmatter.theme} accentColor={frontmatter.accentColor} titleColor={frontmatter.titleColor} bodyColor={frontmatter.bodyColor} backgroundColor={frontmatter.backgroundColor} font={frontmatter.font} className="w-full" />
        </div>
        <div className="px-2 py-1 bg-zinc-900 flex items-center justify-between">
          <span className="text-xs text-zinc-400 truncate">{slide.title}</span>
          <span className="text-xs text-zinc-600">{slide.order + 1}</span>
        </div>
      </button>
    </div>
  );
}

interface Props {
  slides: Slide[];
  frontmatter: DeckFrontmatter;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function SlideList({ slides, frontmatter, selectedId, onSelect, onReorder }: Props) {
  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    onReorder(reordered.map((s) => s.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2">
          {sorted.map((slide) => (
            <SortableItem
              key={slide.id}
              slide={slide}
              frontmatter={frontmatter}
              isSelected={selectedId === slide.id}
              onSelect={() => onSelect(slide.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
