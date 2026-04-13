export interface TimeSlot {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface MeetingOptions {
  allowOnline: boolean;
  allowInPersonOffice: boolean;
  allowInPersonVisit: boolean;
  bufferOnline: number;
  bufferInPersonOffice: number;
  bufferInPersonVisit: number;
}

export interface LinkSettings {
  weekdayTimeSlots: Record<string, TimeSlot[]>;
  excludeHolidays: boolean;
  dateOverrides: Record<string, TimeSlot[]>;
  allowedDurations: number[];
  participants: {
    internalIds: string[];
    externalEmails: string[];
  };
  meetingOptions: MeetingOptions;
  conferenceRoomId?: string;
  visitLocationName?: string;
  visitLocationAddress?: string;
  timezone: string;
}

export interface ScheduleLink {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  duration: number;
  ownerId: string;
  isActive: boolean;
  settings: LinkSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleLinkListItem {
  id: string;
  name: string;
  slug: string;
  duration: number;
  isActive: boolean;
  participantCount: number;
  createdAt: Date;
}
