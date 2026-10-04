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


class BusinessCategory(StrEnum):
    food = "food"
    tuition = "tuition"
    childcare = "childcare"
    pet_care = "pet_care"
    art = "art"
    wellness = "wellness"
    home_services = "home_services"


class BusinessAvailability(StrEnum):
    taking_orders = "taking_orders"
    fully_booked = "fully_booked"
    on_break = "on_break"


class BusinessReviewStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    removed = "removed"


class BusinessServes(StrEnum):
    within_society = "within_society"
    all_towers = "all_towers"


class OfferingUnit(StrEnum):
    each = "each"
    per_meal = "per_meal"
    per_hour = "per_hour"
    per_day = "per_day"
    per_month = "per_month"


class BusinessSort(StrEnum):
    recommended = "recommended"
    newest = "newest"


class Weekday(StrEnum):
    mon = "mon"
    tue = "tue"
    wed = "wed"
    thu = "thu"
    fri = "fri"
    sat = "sat"
    sun = "sun"


class OpeningKind(StrEnum):
    room_available = "room_available"
    flatmate_needed = "flatmate_needed"
    full_flat = "full_flat"


class OpeningFurnishing(StrEnum):
    furnished = "furnished"
    semi_furnished = "semi_furnished"
    unfurnished = "unfurnished"


class OpeningPreference(StrEnum):
    anyone = "anyone"
    women_only = "women_only"
    men_only = "men_only"
    family = "family"
    working_professionals = "working_professionals"


class OpeningIncluded(StrEnum):
    wifi = "wifi"
    ac = "ac"
    parking = "parking"
    power_backup = "power_backup"
    maid = "maid"
    cook = "cook"
    washing_machine = "washing_machine"


class OpeningStatus(StrEnum):
    active = "active"
    filled = "filled"
    removed = "removed"


class OpeningBudget(StrEnum):
    under_20k = "under_20k"
    from_20k_to_40k = "from_20k_to_40k"
    over_40k = "over_40k"


class OpeningSort(StrEnum):
    newest = "newest"
    rent_asc = "rent_asc"


class ChatRole(StrEnum):
    user = "user"
    assistant = "assistant"


class ChatMessageStatus(StrEnum):
    ok = "ok"
    error = "error"


class ChatFeedback(StrEnum):
    up = "up"
    down = "down"


class LlmPurpose(StrEnum):
    chat = "chat"
    summary = "summary"
    fill = "fill"
    route = "route"


class LlmOutcome(StrEnum):
    ok = "ok"
    fallback = "fallback"
    error = "error"


class VendorCategory(StrEnum):
    housekeeping = "housekeeping"
    electrical = "electrical"
    plumbing = "plumbing"
    carpentry = "carpentry"
    pest_control = "pest_control"
    appliance = "appliance"
    security = "security"
    other = "other"


class TicketCategory(StrEnum):
    lift = "lift"
    water = "water"
    electricity = "electricity"
    plumbing = "plumbing"
    security = "security"
    cleanliness = "cleanliness"
    parking = "parking"
    amenity = "amenity"
    noise = "noise"
    other = "other"


class TicketScope(StrEnum):
    my_flat = "my_flat"
    common_area = "common_area"


class TicketUrgency(StrEnum):
    normal = "normal"
    urgent = "urgent"


class TicketStatus(StrEnum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class TicketUpdateKind(StrEnum):
    created = "created"
    status = "status"
    vendor = "vendor"
    committee_note = "committee_note"
    comment = "comment"


class ActorRole(StrEnum):
    resident = "resident"
    committee = "committee"


class FeedbackTopic(StrEnum):
    committee = "committee"
    app = "app"
    suggestion = "suggestion"


class PostType(StrEnum):
    general = "general"
    question = "question"
    alert = "alert"
    lost_found = "lost_found"
    recommendation = "recommendation"
    # Committee announcements; the only posts shown in the Home digest.
    notice = "notice"
