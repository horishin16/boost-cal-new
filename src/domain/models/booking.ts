export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type MeetingMode = 'online' | 'inPerson_office' | 'inPerson_visit';

export interface Booking {
  id: string;
  scheduleLinkId: string;
  clientName: string;
  clientEmail: string;
  startTime: Date;
  endTime: Date;
  eventTitle: string | null;
  meetingUrl: string | null;
  meetingMode: MeetingMode;
  conferenceRoomId: string | null;
  locationName: string | null;
  locationAddress: string | null;
  status: BookingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingInput {
  scheduleLinkId: string;
  clientName: string;
  clientEmail: string;
  startTime: Date;
  endTime: Date;
  eventTitle?: string;
  meetingUrl?: string;
  meetingMode: MeetingMode;
  conferenceRoomId?: string;
  locationName?: string;
  locationAddress?: string;
  notes?: string;
}
