type Props = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
};

function getInitial(name?: string | null, email?: string | null): string {
    return (name ?? email ?? "?")[0]!.toUpperCase();
}

export default function UserAvatar({ name, email, image }: Props) {
    if (image) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={image}
                alt={name ?? email ?? "User avatar"}
                width={32}
                height={32}
                className="rounded-full"
            />
        );
    }

    return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
            {getInitial(name, email)}
        </span>
    );
}
