import {
  Host,
  HorizontalUncontainedCarousel,
  Box,
  Text,
} from "@expo/ui/jetpack-compose";
import { size, background } from "@expo/ui/jetpack-compose/modifiers";

export default function UncontainedExample() {
  const items = ["Photo 1", "Photo 2", "Photo 3", "Photo 4", "Photo 5"];

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <HorizontalUncontainedCarousel
        itemWidth={160}
        itemSpacing={12}
        contentPadding={{ start: 16, top: 0, end: 16, bottom: 0 }}
      >
        {items.map((item) => (
          <Box
            key={item}
            contentAlignment="center"
            modifiers={[size(160, 180), background("#3F51B5")]}
          >
            <Text color="#FFFFFF">{item}</Text>
          </Box>
        ))}
      </HorizontalUncontainedCarousel>
    </Host>
  );
}
