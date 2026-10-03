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


class MembershipInviteStatus(StrEnum):
    pending = "pending"
    consumed = "consumed"
    expired = "expired"
    revoked = "revoked"


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
    rejected = "rejected"
    cancelled = "cancelled"
    completed = "completed"


class EventCategory(StrEnum):
    sports = "sports"
    fitness = "fitness"
    kids = "kids"
    food = "food"
    music = "music"
    learning = "learning"
    social = "social"
    other = "other"


class EventAudience(StrEnum):
    society = "society"
    group = "group"
    towers = "towers"


class EventRecurrence(StrEnum):
    none = "none"
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class EventListTab(StrEnum):
    upcoming = "upcoming"
    going = "going"
    hosting = "hosting"
    past = "past"


class EventTicketStatus(StrEnum):
    reserved = "reserved"
    confirmed = "confirmed"
    cancelled = "cancelled"


class StallApplicationStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    paid = "paid"


class ListingCategory(StrEnum):
    furniture = "furniture"
    electronics = "electronics"
    kids = "kids"
    books = "books"
    sports = "sports"
    home_kitchen = "home_kitchen"


class ListingCondition(StrEnum):
    new = "new"
    like_new = "like_new"
    good = "good"
    fair = "fair"


class ListingStatus(StrEnum):
    available = "available"
    reserved = "reserved"
    sold = "sold"
    removed = "removed"


class ListingContactMethod(StrEnum):
    whatsapp = "whatsapp"
    call = "call"


class ListingSort(StrEnum):
    newest = "newest"
    price_asc = "price_asc"
    price_desc = "price_desc"


class ListingTab(StrEnum):
    active = "active"
    sold = "sold"
