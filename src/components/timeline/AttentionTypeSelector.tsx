import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';
import {
  AttentionType,
  RoleMode,
  ATTENTION_TYPE_DESCRIPTIONS,
  ATTENTION_TYPES,
  getAttentionTypeCompatibility
} from '@/lib/attentionTypes';

interface AttentionTypeSelectorProps {
  value?: AttentionType | null;
  onChange: (value: AttentionType | null) => void;
  currentRole?: RoleMode;
  placeholder?: string;
  disabled?: boolean;
  showCompatibilityWarnings?: boolean;
  showDescriptions?: boolean;
  required?: boolean;
  className?: string;
}

export function AttentionTypeSelector({
  value,
  onChange,
  currentRole,
  placeholder = "Select attention type...",
  disabled = false,
  showCompatibilityWarnings = true,
  showDescriptions = true,
  required = false,
  className
}: AttentionTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = (newValue: string) => {
    if (newValue === 'none') {
      onChange(null);
    } else {
      onChange(newValue as AttentionType);
    }
  };

  // Get compatibility for current selection
  const compatibility = value && currentRole ?
    getAttentionTypeCompatibility(value, currentRole) : null;

  // Get selected type description
  const selectedTypeDesc = value ? ATTENTION_TYPE_DESCRIPTIONS[value] : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selector */}
      <Select
        value={value || 'none'}
        onValueChange={handleValueChange}
        disabled={disabled}
        open={isOpen}
        onOpenChange={setIsOpen}
        required={required}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {value && (
              <div className="flex items-center gap-2">
                <span>{ATTENTION_TYPE_DESCRIPTIONS[value].icon}</span>
                <span>{ATTENTION_TYPE_DESCRIPTIONS[value].label}</span>
                {currentRole && (
                  <Badge
                    variant={compatibility === 'high' ? 'default' : compatibility === 'medium' ? 'secondary' : 'outline'}
                    className="text-xs ml-auto"
                  >
                    {compatibility === 'high' ? 'Optimal' : compatibility === 'medium' ? 'Good' : 'Consider'}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[320px] overflow-y-auto">
          {/* None/Clear option */}
          <SelectItem value="none" className="text-muted-foreground">
            <span>No attention type</span>
          </SelectItem>

          {/* Attention type options */}
          {Object.values(ATTENTION_TYPES).map((type) => {
            const desc = ATTENTION_TYPE_DESCRIPTIONS[type];
            const typeCompatibility = currentRole ? getAttentionTypeCompatibility(type, currentRole) : 'medium';

            return (
              <SelectItem key={type} value={type} className="py-3">
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-lg">{desc.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{desc.label}</span>
                        {currentRole && (
                          <Badge
                            variant={typeCompatibility === 'high' ? 'default' : typeCompatibility === 'medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {typeCompatibility === 'high' ? 'Optimal' : typeCompatibility === 'medium' ? 'Good' : 'Consider'}
                          </Badge>
                        )}
                      </div>
                      {showDescriptions && (
                        <>
                          <p className="text-xs text-muted-foreground mt-1 leading-tight">
                            {desc.description}
                          </p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {desc.examples.slice(0, 3).map((example, idx) => (
                              <span key={idx} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {example}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Compatibility Warning */}
      {showCompatibilityWarnings && value && currentRole && compatibility === 'low' && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <span className="font-medium">Role Compatibility:</span> {selectedTypeDesc?.label} activities may not align well with your current {currentRole} mode. Consider if this is the best use of your attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Selected Type Info */}
      {showDescriptions && value && (
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">{selectedTypeDesc!.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-sm">{selectedTypeDesc!.label}</h4>
                {currentRole && (
                  <Badge
                    variant={compatibility === 'high' ? 'default' : compatibility === 'medium' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {compatibility === 'high' ? 'Optimal for ' : compatibility === 'medium' ? 'Good for ' : 'Consider for '}{currentRole} mode
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedTypeDesc!.description}
              </p>
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Common examples: {selectedTypeDesc!.examples.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}