type AvatarType =
  "fox" | "bunny" | "cat" | "frog" | "bear" | "owl" | "bee" | "penguin";

interface ProfileAvatarProps {
  avatar: AvatarType;
  size?: number;
}

const avatarSvgs: Record<AvatarType, string> = {
  fox: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Ears -->
    <rect x="4" y="2" width="4" height="4" fill="#E8752C"/>
    <rect x="5" y="3" width="2" height="2" fill="#FFF8DC"/>
    <rect x="24" y="2" width="4" height="4" fill="#E8752C"/>
    <rect x="25" y="3" width="2" height="2" fill="#FFF8DC"/>
    <!-- Head -->
    <rect x="6" y="6" width="20" height="16" fill="#E8752C"/>
    <rect x="7" y="7" width="18" height="14" fill="#F4A460"/>
    <!-- Face white -->
    <rect x="8" y="8" width="16" height="12" fill="#FFF8DC"/>
    <!-- Eyes -->
    <rect x="10" y="10" width="2" height="3" fill="#000"/>
    <rect x="20" y="10" width="2" height="3" fill="#000"/>
    <!-- Snout white -->
    <rect x="10" y="13" width="12" height="4" fill="#FFF8DC"/>
    <!-- Nose -->
    <rect x="14" y="14" width="4" height="2" fill="#000"/>
    <!-- Mouth -->
    <rect x="14" y="16" width="1" height="1" fill="#000"/>
    <rect x="17" y="16" width="1" height="1" fill="#000"/>
    <!-- Chin -->
    <rect x="9" y="19" width="14" height="2" fill="#FFF8DC"/>
  </svg>`,

  bunny: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Ears -->
    <rect x="8" y="0" width="3" height="8" fill="#E8B4E3"/>
    <rect x="8" y="1" width="1" height="6" fill="#FFF8DC"/>
    <rect x="21" y="0" width="3" height="8" fill="#E8B4E3"/>
    <rect x="22" y="1" width="1" height="6" fill="#FFF8DC"/>
    <!-- Head -->
    <rect x="6" y="8" width="20" height="16" fill="#E8B4E3"/>
    <rect x="7" y="9" width="18" height="14" fill="#F8D7F4"/>
    <!-- Face white -->
    <rect x="8" y="10" width="16" height="12" fill="#FFF8DC"/>
    <!-- Eyes -->
    <rect x="10" y="12" width="2" height="2" fill="#000"/>
    <rect x="20" y="12" width="2" height="2" fill="#000"/>
    <!-- Nose pink -->
    <rect x="15" y="15" width="2" height="2" fill="#E8B4E3"/>
    <!-- Mouth -->
    <rect x="14" y="17" width="1" height="1" fill="#000"/>
    <rect x="17" y="17" width="1" height="1" fill="#000"/>
    <!-- Whiskers -->
    <rect x="6" y="14" width="2" height="1" fill="#000"/>
    <rect x="24" y="14" width="2" height="1" fill="#000"/>
  </svg>`,

  cat: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Ears -->
    <rect x="6" y="2" width="3" height="5" fill="#8B4513"/>
    <rect x="7" y="3" width="1" height="3" fill="#FFB6C1"/>
    <rect x="23" y="2" width="3" height="5" fill="#8B4513"/>
    <rect x="24" y="3" width="1" height="3" fill="#FFB6C1"/>
    <!-- Head -->
    <rect x="6" y="7" width="20" height="16" fill="#8B4513"/>
    <rect x="7" y="8" width="18" height="14" fill="#A0522D"/>
    <!-- Face cream -->
    <rect x="8" y="9" width="16" height="12" fill="#FFEFD5"/>
    <!-- Eyes -->
    <rect x="10" y="11" width="2" height="3" fill="#90EE90"/>
    <rect x="20" y="11" width="2" height="3" fill="#90EE90"/>
    <rect x="11" y="12" width="1" height="1" fill="#000"/>
    <rect x="21" y="12" width="1" height="1" fill="#000"/>
    <!-- Nose -->
    <rect x="15" y="15" width="2" height="2" fill="#FFB6C1"/>
    <!-- Mouth -->
    <rect x="14" y="17" width="1" height="1" fill="#000"/>
    <rect x="17" y="17" width="1" height="1" fill="#000"/>
  </svg>`,

  frog: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Head spots -->
    <rect x="6" y="6" width="4" height="4" fill="#6B8E23"/>
    <rect x="22" y="6" width="4" height="4" fill="#6B8E23"/>
    <!-- Head -->
    <rect x="6" y="10" width="20" height="12" fill="#7CB342"/>
    <rect x="7" y="11" width="18" height="10" fill="#8BC34A"/>
    <!-- Face -->
    <rect x="8" y="12" width="16" height="8" fill="#CDDC39"/>
    <!-- Eyes -->
    <rect x="10" y="10" width="3" height="3" fill="#FFF"/>
    <rect x="11" y="11" width="1" height="1" fill="#000"/>
    <rect x="19" y="10" width="3" height="3" fill="#FFF"/>
    <rect x="20" y="11" width="1" height="1" fill="#000"/>
    <!-- Mouth -->
    <rect x="12" y="17" width="8" height="1" fill="#000"/>
    <rect x="13" y="18" width="6" height="1" fill="#7CB342"/>
  </svg>`,

  bear: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Ears -->
    <rect x="5" y="4" width="3" height="3" fill="#2F1B10"/>
    <rect x="24" y="4" width="3" height="3" fill="#2F1B10"/>
    <!-- Head -->
    <rect x="5" y="7" width="22" height="16" fill="#654321"/>
    <rect x="6" y="8" width="20" height="14" fill="#8B4513"/>
    <!-- Face tan -->
    <rect x="8" y="10" width="16" height="10" fill="#D2B48C"/>
    <!-- Eyes -->
    <rect x="10" y="12" width="2" height="2" fill="#000"/>
    <rect x="20" y="12" width="2" height="2" fill="#000"/>
    <!-- Nose -->
    <rect x="15" y="15" width="2" height="2" fill="#000"/>
    <!-- Mouth -->
    <rect x="14" y="17" width="1" height="1" fill="#000"/>
    <rect x="17" y="17" width="1" height="1" fill="#000"/>
    <!-- Snout definition -->
    <rect x="9" y="17" width="14" height="1" fill="#C9A876"/>
  </svg>`,

  owl: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Head -->
    <rect x="6" y="6" width="20" height="18" fill="#6B5344"/>
    <rect x="7" y="7" width="18" height="16" fill="#8B6E47"/>
    <!-- Face -->
    <rect x="8" y="8" width="16" height="14" fill="#D4A574"/>
    <!-- Large eyes -->
    <rect x="9" y="10" width="4" height="4" fill="#FFF"/>
    <rect x="10" y="11" width="2" height="2" fill="#000"/>
    <rect x="19" y="10" width="4" height="4" fill="#FFF"/>
    <rect x="20" y="11" width="2" height="2" fill="#000"/>
    <!-- Nose/beak -->
    <rect x="15" y="15" width="2" height="2" fill="#8B6E47"/>
    <!-- Mouth -->
    <rect x="14" y="17" width="1" height="1" fill="#000"/>
    <rect x="17" y="17" width="1" height="1" fill="#000"/>
    <!-- Tuft lines -->
    <rect x="7" y="5" width="2" height="1" fill="#6B5344"/>
    <rect x="23" y="5" width="2" height="1" fill="#6B5344"/>
  </svg>`,

  bee: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Wings -->
    <rect x="2" y="8" width="4" height="6" fill="#E6F3FF" opacity="0.7"/>
    <rect x="26" y="8" width="4" height="6" fill="#E6F3FF" opacity="0.7"/>
    <!-- Body stripes -->
    <rect x="10" y="6" width="12" height="3" fill="#FFD700"/>
    <rect x="10" y="9" width="12" height="3" fill="#000"/>
    <rect x="10" y="12" width="12" height="3" fill="#FFD700"/>
    <rect x="10" y="15" width="12" height="3" fill="#000"/>
    <rect x="10" y="18" width="12" height="3" fill="#FFD700"/>
    <!-- Head -->
    <rect x="11" y="20" width="10" height="4" fill="#000"/>
    <!-- Eyes -->
    <rect x="13" y="21" width="1" height="1" fill="#FFF"/>
    <rect x="18" y="21" width="1" height="1" fill="#FFF"/>
    <!-- Stinger -->
    <rect x="15" y="24" width="2" height="3" fill="#FFD700"/>
  </svg>`,

  penguin: `<svg shape-rendering="crispEdges" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Head -->
    <rect x="9" y="4" width="14" height="10" fill="#000"/>
    <!-- White face -->
    <rect x="10" y="6" width="12" height="7" fill="#FFF"/>
    <!-- Eyes -->
    <rect x="11" y="7" width="2" height="2" fill="#000"/>
    <rect x="19" y="7" width="2" height="2" fill="#000"/>
    <!-- Body -->
    <rect x="8" y="14" width="16" height="12" fill="#000"/>
    <!-- Belly white -->
    <rect x="10" y="15" width="12" height="10" fill="#FFF"/>
    <!-- Feet -->
    <rect x="10" y="26" width="3" height="2" fill="#FF8C00"/>
    <rect x="19" y="26" width="3" height="2" fill="#FF8C00"/>
    <!-- Beak -->
    <rect x="14" y="11" width="4" height="2" fill="#FF8C00"/>
  </svg>`,
};

const ProfileAvatar = ({ avatar, size = 72 }: ProfileAvatarProps) => {
  return (
    <div
      className="profile-avatar"
      style={{
        width: size,
        height: size,
        display: "inline-block",
      }}
      dangerouslySetInnerHTML={{ __html: avatarSvgs[avatar] }}
      aria-hidden="true"
    />
  );
};

export default ProfileAvatar;
