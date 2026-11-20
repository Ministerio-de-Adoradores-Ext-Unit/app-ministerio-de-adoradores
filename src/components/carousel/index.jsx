import React, { useState, useEffect, useRef } from "react";
import { View, FlatList, Image, useWindowDimensions } from "react-native";
import Animated, {
  Layout,
  FadeInLeft,
  FadeOutRight,
} from "react-native-reanimated";
import img1 from "../../../assets/img/ctn_primeiro.png";
import img2 from "../../../assets/img/Rectangle 1.png";
import img3 from "../../../assets/img/ctn_terceiro.png";
import useScreenData, { PUBLIC_CONTENT_REFRESH_MS } from "../../hooks/useScreenData";
import { listHomeCarouselMedia } from "../../services/supabaseCarousel";

const DEFAULT_BANNERS = [
  { id: "default-1", image: img1 },
  { id: "default-2", image: img2 },
  { id: "default-3", image: img3 },
];

function CarouselTrack({ banners }) {
  const { width } = useWindowDimensions();
  const BANNER_WIDTH = width * 0.8;
  const HORIZONTAL_MARGIN = width * 0.1;
  const BANNER_HEIGHT = width * 0.45;

  const [activeBanner, setActiveBanner] = useState(0);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = ({ viewableItems }) => {
    if (viewableItems[0] !== undefined) {
      setActiveBanner(viewableItems[0]?.index);
    }
  };

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: 80,
      },
      onViewableItemsChanged,
    },
  ]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timeoutId = setTimeout(() => {
      const nextIndex = (activeBanner + 1) % banners.length;

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [activeBanner, banners.length]);

  return (
    <View style={{ width }}>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View
            style={{
              width: BANNER_WIDTH,
              height: BANNER_HEIGHT,
              marginHorizontal: HORIZONTAL_MARGIN,
              borderRadius: 30,
              alignItems: "center",
            }}
          >
            <Image
              source={item.image}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 30,
              }}
              resizeMode="cover"
            />
          </View>
        )}
        style={{ width, paddingTop: 20 }}
        pagingEnabled
        horizontal
        showsHorizontalScrollIndicator={false}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
      />

      <FlatList
        data={banners}
        renderItem={({ index }) => (
          <Animated.View
            layout={Layout}
            entering={FadeInLeft}
            exiting={FadeOutRight}
            style={{
              width: activeBanner === index ? 12 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: activeBanner === index ? "black" : "gray",
              marginHorizontal: 4,
            }}
          />
        )}
        horizontal
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 16, alignSelf: "center" }}
        contentContainerStyle={{ paddingBottom: 10 }}
      />
    </View>
  );
}

export default function Carousel() {
  const { data } = useScreenData(listHomeCarouselMedia, {
    refreshMs: PUBLIC_CONTENT_REFRESH_MS, backgroundRefresh: true,
  });
  const banners = data.length
    ? data.map(({ id, imageUrl }) => ({ id, image: { uri: imageUrl } }))
    : DEFAULT_BANNERS;

  // Reinicia o índice quando as imagens da lista mudam.
  return <CarouselTrack key={banners.map(({ id }) => id).join(",")} banners={banners} />;
}
