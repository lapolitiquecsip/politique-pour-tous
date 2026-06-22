import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import clsx from "clsx";

interface AvatarProps {
  placeholder?: boolean;
  size?: number;
  src?: string;
  alt?: string;
}

export const Avatar = ({ placeholder = false, size = 24, src, alt = "Avatar" }: AvatarProps) => {
  if (placeholder) {
    return (
      <Skeleton rounded height={size} width={size} className="border border-slate-200" />
    );
  }

  return (
    <span
      className="rounded-full inline-block overflow-hidden border border-slate-200 duration-200 bg-white shadow-sm shrink-0"
      style={{ width: size, height: size }}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover p-0.5"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${alt.substring(0,2)}&background=random`;
          }}
        />
      )}
    </span>
  );
};

interface AvatarGroupProps {
  members: {
    username?: string;
    src?: string;
  }[];
  size?: number;
  limit?: number;
}

export const AvatarGroup = ({ members, size = 24, limit = 3 }: AvatarGroupProps) => {
  return (
    <div className="flex items-center">
      {(members.length >= limit ? members.slice(0, limit - 1) : members).map((member, index) => (
        <span
          key={member.username + String(index)}
          className={clsx("inline-flex items-center", index !== 0 && "-ml-2")}
          style={{ zIndex: limit - index }}
          title={member.username}
        >
          <span
            className="rounded-full inline-block overflow-hidden border-2 border-white bg-white duration-200 shadow-sm"
            style={{ width: size, height: size }}
          >
            {member.src && (
              <img
                src={member.src}
                alt={`Avatar for ${member.username}`}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${member.username?.substring(0,2)}&background=random`;
                }}
              />
            )}
          </span>
        </span>
      ))}
      
      {members.length > limit - 1 && members.length === limit && (
        <span
          key="last-member"
          className="inline-flex items-center -ml-2"
          style={{ zIndex: 0 }}
          title={members[members.length - 1].username}
        >
          <span
            className="rounded-full inline-block overflow-hidden border-2 border-white bg-white duration-200 shadow-sm"
            style={{ width: size, height: size }}
          >
            <img
              src={members[members.length - 1].src}
              alt={members[members.length - 1].username}
              className="w-full h-full object-contain p-0.5"
            />
          </span>
        </span>
      )}

      {members.length > limit && (
        <span
          className="inline-flex items-center -ml-2 dark"
          style={{ zIndex: 0 }}
          title={`${members.length - limit + 1} autres sources`}
        >
          <span
            className="rounded-full overflow-hidden border-2 border-white bg-slate-100 duration-200 flex justify-center items-center text-slate-800 text-[10px] font-bold shadow-sm"
            style={{ width: size, height: size }}
          >
            +{members.length - limit + 1}
          </span>
        </span>
      )}
    </div>
  );
};
