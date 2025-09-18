import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, Image, useWindowDimensions } from 'react-native';
import Animated, {
  Layout,
  FadeInLeft,
  FadeOutRight,
} from 'react-native-reanimated';
import img1 from '../../../assets/img/ctn_primeiro.png';
import img2 from '../../../assets/img/Rectangle 1.png';
import img3 from '../../../assets/img/ctn_terceiro.png';

const DATA = [
  { image: img1 },
  { image: img2 },
  { image: img3 },
];

const Carousel = () => {
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
    if (activeBanner >= DATA.length - 1) return;

    const timeoutId = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: activeBanner + 1,
        animated: true,
      });
      setActiveBanner((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [activeBanner]);

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={DATA}
        keyExtractor={(item, index) => String(index)}
        renderItem={({ item }) => (
          <View
            style={{
              width: BANNER_WIDTH,
              height: BANNER_HEIGHT,
              marginHorizontal: HORIZONTAL_MARGIN,
              borderRadius: 30,
              alignItems: 'center',
            }}
          >
            <Image
              source={item.image}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 30,
              }}
              resizeMode="cover"
            />
          </View>
        )}
        style={{ paddingTop: 20 }}
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_MARGIN / 2 }}
        pagingEnabled
        horizontal
        showsHorizontalScrollIndicator={false}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
      />

      <FlatList
        data={DATA}
        renderItem={({ index }) => (
          <Animated.View
            layout={Layout}
            entering={FadeInLeft}
            exiting={FadeOutRight}
            style={{
              width: activeBanner === index ? 12 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: activeBanner === index ? 'black' : 'gray',
              marginHorizontal: 4,
            }}
          />
        )}
        horizontal
        scrollEnabled={false}
        keyExtractor={(item, index) => String(index)}
        style={{ marginTop: 16, alignSelf: 'center' }}
        contentContainerStyle={{ paddingBottom: 10 }}
      />
    </View>
  );
};
export default Carousel;
