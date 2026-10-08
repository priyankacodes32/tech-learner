import { Check, ChevronsUpDown } from "lucide-react";
import {
  type CountryCode,
  AsYouType,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import { useMemo, useState } from "react";
import * as flags from "country-flag-icons/react/3x2";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CountryPhoneInputProps = {
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  onNumberChange: (value: string) => void;
  value: string;
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function CountryPhoneInput({
  country,
  onCountryChange,
  onNumberChange,
  value,
}: CountryPhoneInputProps) {
  const [open, setOpen] = useState(false);
  const countries = useMemo(
    () =>
      getCountries()
        .map((code) => ({
          code,
          name: regionNames.of(code) ?? code,
          dialCode: `+${getCountryCallingCode(code)}`,
        }))
        .sort((first, second) => first.name.localeCompare(second.name)),
    [],
  );
  const selected = countries.find((item) => item.code === country);
  const SelectedFlag = flags[country as keyof typeof flags];

  function updateNumber(nextValue: string) {
    const digits = nextValue.replace(/\D/g, "").slice(0, 15);
    onNumberChange(new AsYouType(country).input(digits));
  }

  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label="Select country calling code"
            aria-expanded={open}
            className="h-9 min-w-0 justify-between px-3 font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              {SelectedFlag && (
                <SelectedFlag className="h-4 w-6 shrink-0 rounded-[2px]" title={selected?.name} />
              )}
              <span className="truncate">{selected?.dialCode}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search country or code…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countries.map((item) =>
                  (() => {
                    const Flag = flags[item.code as keyof typeof flags];
                    return (
                      <CommandItem
                        key={item.code}
                        value={`${item.name} ${item.code} ${item.dialCode}`}
                        onSelect={() => {
                          onCountryChange(item.code);
                          onNumberChange("");
                          setOpen(false);
                        }}
                      >
                        {Flag ? (
                          <Flag className="h-4 w-6 shrink-0 rounded-[2px]" title={item.name} />
                        ) : (
                          <span className="w-6 text-xs font-bold text-muted-foreground">
                            {item.code}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className="text-muted-foreground">{item.dialCode}</span>
                        <Check
                          className={cn(
                            "size-4",
                            country === item.code ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })(),
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id="student-phone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        required
        maxLength={24}
        value={value}
        onChange={(event) => updateNumber(event.target.value)}
        placeholder="Phone number"
        aria-label="Student phone number"
      />
    </div>
  );
}
