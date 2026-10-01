from enum import StrEnum


class SocietyPlan(StrEnum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class MembershipRole(StrEnum):
    owner = "owner"
    tenant = "tenant"
    landlord = "landlord"
    committee = "committee"
    admin = "admin"


class MembershipStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AmenityType(StrEnum):
    gym = "gym"
    pool = "pool"
    court = "court"
    hall = "hall"
    amphitheatre = "amphitheatre"
    other = "other"


class CrowdLevel(StrEnum):
    quiet = "quiet"
    moderate = "moderate"
    busy = "busy"
    closed = "closed"


class AmenityBookingStatus(StrEnum):
    confirmed = "confirmed"
    pending = "pending"
    cancelled = "cancelled"


class GroupMemberRole(StrEnum):
    admin = "admin"
    member = "member"


class JoinTargetType(StrEnum):
    group = "group"
    whatsapp = "whatsapp"


class JoinRequestStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ReactionType(StrEnum):
    like = "like"
    celebrate = "celebrate"
    support = "support"


class EventType(StrEnum):
    free = "free"
    paid = "paid"
    society = "society"


class EventStatus(StrEnum):
    draft = "draft"
    pending_approval = "pending_approval"
    published = "published"
    cancelled = "cancelled"
    completed = "completed"


class EventTicketStatus(StrEnum):
    reserved = "reserved"
    confirmed = "confirmed"
    cancelled = "cancelled"


class StallApplicationStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    paid = "paid"
