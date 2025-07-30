"use client";
import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react"; // or any icons
import Image from "next/image";

type AppOption = {
  name: string;
  appname: string;
  icon_url: string;
};

type Props = {
  groupedApps: Record<string, AppOption[]>;
  setAppName: (name: string) => void;
  appName: string;
};

export default function AppSelectDropdown({
  groupedApps,
  appName,
  setAppName,
}: Props) {
  const allApps: AppOption[] = Object.values(groupedApps)
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedApp = allApps.find((a) => a.appname === appName) ?? null;

  return (
    <div className="w-full">
      <Listbox
        value={selectedApp}
        onChange={(val) => {
          if (val) setAppName(val.appname);
        }}
      >
        <div className="relative">
          <Listbox.Button className="w-full cursor-pointer rounded border-blue-500 border-2 p-3 text-left flex items-center justify-between">
            {selectedApp ? (
              <div className="flex items-center gap-2">
                <Image
                  src={selectedApp.icon_url}
                  alt={selectedApp.name}
                  width={24}
                  height={24}
                />
                <span>{selectedApp.name}</span>
              </div>
            ) : (
              <span>Select App</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute w-full z-10 mt-1 rounded-md border bg-white p-4 shadow-lg overflow-y-auto max-h-[10rem] grid grid-cols-4 gap-2">
              {allApps.map((app) => (
                <Listbox.Option
                  key={app.appname}
                  value={app}
                  className={({ active }) =>
                    `cursor-pointer rounded p-2 flex flex-col items-center justify-center border hover:bg-blue-100`
                  }
                >
                  {({ selected }) => (
                    <>
                      <Image
                        src={app.icon_url}
                        alt={app.name}
                        width={32}
                        height={32}
                        className="mb-1 object-contain"
                      />
                      <span className="text-xs text-center">{app.name}</span>
                      {selected && (
                        <Check className="absolute top-1 right-1 w-4 h-4 text-blue-600" />
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
