/**
 * Cấu hình chung của website. Chỉnh các giá trị ở đây, không cần sửa code.
 */
export const config = {
    companyName: "ANT Group",
    title: "Chúc mừng ngày 20/10",
    subtitle: "Hành trình thu thập hoa tặng các chị em 🌸",
    introHint:
        "Bấm vào bất kỳ ngôi nhà nào để ghé thăm phòng ban. Kéo để xoay, cuộn hoặc chụm để zoom bản đồ.",

    // Phòng ban, nhân viên, nhạc nền và video quà được cấu hình ở trang /admin (xem src/data/siteData.ts).

    /** Hiệu ứng âm thanh. Nếu file không tồn tại, website vẫn chạy bình thường (chỉ không có tiếng). */
    audio: {
        step: "/audio/step.mp3",
        pop: "/audio/pop.mp3",
        gift: "/audio/gift.mp3",
    },

    outro: {
        title: "Chúc các chị em luôn xinh đẹp, hạnh phúc ❤️",
        message:
            "Cảm ơn các chị em đã luôn đồng hành, mang năng lượng tích cực và nụ cười đến công ty. Chúc mọi người ngày 20/10 thật rực rỡ!",
    },

    /** Tên nhân vật dẫn đường, hiện ở intro và thông báo. */
    mascotName: "Mèo Mi",
};

export type AppConfig = typeof config;
