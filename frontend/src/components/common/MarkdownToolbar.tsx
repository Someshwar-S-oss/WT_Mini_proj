import { Button } from '../ui/button';

interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
  disabled?: boolean;
}

export default function MarkdownToolbar({ onInsert, disabled }: MarkdownToolbarProps) {
  const toolbarButtons = [
    {
      group: 'Headings',
      items: [
        { icon: 'H1', label: 'Heading 1', action: () => onInsert('# ', 0) },
        { icon: 'H2', label: 'Heading 2', action: () => onInsert('## ', 0) },
        { icon: 'H3', label: 'Heading 3', action: () => onInsert('### ', 0) },
      ]
    },
    {
      group: 'Text Formatting',
      items: [
        { 
          icon: '𝐁', 
          label: 'Bold', 
          action: () => onInsert('**bold text**', -2) 
        },
        { 
          icon: '𝐼', 
          label: 'Italic', 
          action: () => onInsert('*italic text*', -1) 
        },
        { 
          icon: '≡', 
          label: 'Strikethrough', 
          action: () => onInsert('~~strikethrough~~', -2) 
        },
        { 
          icon: '<>', 
          label: 'Inline Code', 
          action: () => onInsert('`code`', -1) 
        },
      ]
    },
    {
      group: 'Lists',
      items: [
        { 
          icon: '•', 
          label: 'Bullet List', 
          action: () => onInsert('- List item\n- ', 0) 
        },
        { 
          icon: '1.', 
          label: 'Numbered List', 
          action: () => onInsert('1. List item\n2. ', 0) 
        },
        { 
          icon: '☐', 
          label: 'Task List', 
          action: () => onInsert('- [ ] Task\n- [ ] ', 0) 
        },
      ]
    },
    {
      group: 'Insert',
      items: [
        { 
          icon: '🔗', 
          label: 'Link', 
          action: () => onInsert('[link text](url)', -1) 
        },
        { 
          icon: '🖼', 
          label: 'Image', 
          action: () => onInsert('![alt text](image-url)', -1) 
        },
        { 
          icon: '```', 
          label: 'Code Block', 
          action: () => onInsert('```\ncode\n```', -4) 
        },
        { 
          icon: '>', 
          label: 'Quote', 
          action: () => onInsert('> ', 0) 
        },
      ]
    },
    {
      group: 'Structure',
      items: [
        { 
          icon: '⊞', 
          label: 'Table', 
          action: () => onInsert('| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', 0) 
        },
        { 
          icon: '—', 
          label: 'Horizontal Rule', 
          action: () => onInsert('\n---\n', 0) 
        },
      ]
    },
  ];

  return (
    <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-1 overflow-x-auto">
      {toolbarButtons.map((group, groupIndex) => (
        <div key={group.group} className="flex items-center gap-1">
          {groupIndex > 0 && (
            <div className="h-6 w-px bg-border mx-1"></div>
          )}
          {group.items.map((item) => (
            <Button
              key={item.label}
              onClick={item.action}
              disabled={disabled}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-mono hover:bg-accent hover:text-accent-foreground"
              title={item.label}
            >
              {item.icon}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
